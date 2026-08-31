import { findSubjectContentByOid } from './findSubjectContentByOid';
import {
  type DeviceAuthenticityConfig,
  type VerifyAuthenticityProofParams,
  type VerifyAuthenticityProofResult,
} from './types';
import { validateCaCertExtensions } from './validateCaCertExtensions';
import { getVerifyFn } from './verifySignatures';
import { type ParsedCertificate, parseCertificate } from './x509certificate';

const getChunkSize = (byteLength: number): Uint8Array => {
  if (byteLength < 0xfd) return Uint8Array.from([byteLength]);
  if (byteLength <= 0xffff) {
    const b = Buffer.alloc(3);
    b[0] = 0xfd;
    b.writeUInt16LE(byteLength, 1);

    return Uint8Array.from(b);
  }
  const b = Buffer.alloc(5);
  b[0] = 0xfe;
  b.writeUInt32LE(byteLength, 1);

  return Uint8Array.from(b);
};

// Compose the data against which the signatures are verified: each chunk is
// prefixed with its compact-size length. Matches the firmware's signed payload.
export const prepareDeviceAuthenticityData = ({
  payload,
  prefix = 'AuthenticateDevice:',
}: {
  payload: Buffer | Buffer[];
  prefix?: string;
}): Uint8Array => {
  const chunks = [
    Uint8Array.from(Buffer.from(prefix)),
    ...(Array.isArray(payload) ? payload : [payload]).map(chunk => Uint8Array.from(chunk)),
  ];
  const framed = chunks.flatMap(chunk => [getChunkSize(chunk.byteLength), chunk]);
  const result = new Uint8Array(framed.reduce((total, chunk) => total + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of framed) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
};

const getRootPubKeys = ({
  config,
  deviceModel,
  proofType,
  allowDebugKeys,
}: {
  config: DeviceAuthenticityConfig;
  deviceModel: string;
  proofType: 'optiga' | 'tropic';
  allowDebugKeys?: boolean;
}): string[] => {
  const modelConfig = config[deviceModel];
  if (!modelConfig || typeof modelConfig === 'number') {
    throw new Error(`Pubkeys for ${deviceModel} not found in config`);
  }
  const prod =
    proofType === 'optiga'
      ? modelConfig.rootPubKeysOptiga ?? []
      : modelConfig.rootPubKeysTropic ?? [];
  if (!allowDebugKeys) return prod;

  return [
    ...prod,
    ...(proofType === 'optiga'
      ? modelConfig.debug?.rootPubKeysOptiga ?? []
      : modelConfig.debug?.rootPubKeysTropic ?? []),
  ];
};

const matchRootPubKeyToCertificate = ({
  cert,
  allRootPubKeys,
}: {
  cert: ParsedCertificate;
  allRootPubKeys: string[];
}): string | undefined => {
  const verifySignatureFn = getVerifyFn(cert.signatureAlgorithm.algorithmName);

  return allRootPubKeys.find(rootPubKey =>
    verifySignatureFn(
      Uint8Array.from(Buffer.from(rootPubKey, 'hex')),
      cert.tbsCertificate.asn1.raw,
      cert.signatureValue.bits.bytes
    )
  );
};

// Get internal model name from the device cert Subject (OID 2.5.4.3), e.g. 'T2B1'.
const parseModelFromDeviceCertSubject = (deviceCert: ParsedCertificate) => {
  const modelDescriptionBytes = findSubjectContentByOid(deviceCert, '2.5.4.3');
  if (modelDescriptionBytes === null) return null;

  // the whole string is e.g. 'T3W1 Trezor Safe 7', only the first 4 chars are the model
  return Buffer.from(modelDescriptionBytes.subarray(0, 4)).toString();
};

// Get serial number from the device cert Subject (OID 2.5.4.5). Only present on T3W1 and above.
const parseSerialNumberFromDeviceCert = (deviceCert: ParsedCertificate) => {
  const serialNumber = findSubjectContentByOid(deviceCert, '2.5.4.5');
  if (serialNumber === null) return undefined;

  return Buffer.from(serialNumber).toString('hex');
};

/**
 * Verifies the signing scheme: rootPubKey → CA pub key → device key → signature of prefixed challenge.
 * Returns the per-device attestation public key (`deviceCertPubKey`) on success.
 */
export const verifyAuthenticityProof = ({
  proofType,
  certificates,
  signature,
  signedData,
  deviceModel,
  config,
  allowDebugKeys,
  caPubKeyBlacklist = [],
}: VerifyAuthenticityProofParams): VerifyAuthenticityProofResult => {
  const allRootPubKeys = getRootPubKeys({
    config,
    deviceModel,
    proofType,
    allowDebugKeys,
  });

  const parsedCertificates = certificates.map(c =>
    parseCertificate(new Uint8Array(Buffer.from(c, 'hex')))
  );

  const firstCertAlgName = parsedCertificates[0]?.signatureAlgorithm.algorithmName;
  // This mirrors Trezor Connect's production policy: Optiga uses P-256 and
  // Safe 7's additional Tropic proof uses Ed25519. MCU/ML-DSA is not a separate
  // client-side pass/fail condition.
  const expectedAlgorithmName = proofType === 'optiga' ? 'P-256' : 'Ed25519';
  if (firstCertAlgName !== expectedAlgorithmName) {
    return { valid: false, error: 'RESPONSE_MALFORMED' };
  }
  if (parsedCertificates.length !== 2) {
    return { valid: false, error: 'RESPONSE_MALFORMED' };
  }

  const [deviceCert, caCert] = parsedCertificates;
  const deviceCertPubKey = Buffer.from(
    deviceCert.tbsCertificate.subjectPublicKeyInfo.bits.bytes
  ).toString('hex');

  const deviceCertAlgName = deviceCert.signatureAlgorithm.algorithmName;
  const caCertAlgName = caCert.signatureAlgorithm.algorithmName;
  if (deviceCertAlgName !== caCertAlgName) {
    return { valid: false, deviceCertPubKey, error: 'RESPONSE_MALFORMED' };
  }

  validateCaCertExtensions(caCert, 0); // pathLenConstraint is always 0 (single CA cert, no chain)
  const verifySignatureFn = getVerifyFn(deviceCertAlgName);

  // 1) CA certificate must be signed by one of the trusted root pub keys.
  const caPubKeyBytes = caCert.tbsCertificate.subjectPublicKeyInfo.bits.bytes;
  const caPubKey = Buffer.from(caPubKeyBytes).toString('hex');
  const rootPubKeyMatch = matchRootPubKeyToCertificate({ allRootPubKeys, cert: caCert });
  if (rootPubKeyMatch === undefined) {
    return { valid: false, caPubKey, deviceCertPubKey, error: 'ROOT_PUBKEY_NOT_FOUND' };
  }
  // Revocation: reject a specific (e.g. leaked) intermediate CA even if it chains
  // to a trusted root.
  if (caPubKeyBlacklist.includes(caPubKey)) {
    return {
      valid: false,
      caPubKey,
      rootPubKey: rootPubKeyMatch,
      deviceCertPubKey,
      error: 'CA_PUBKEY_BLACKLISTED',
    };
  }
  // Both the CA and the device leaf must be currently valid: neither cert's
  // notBefore may be in the future, and neither may already be past notAfter.
  // An expired link in the chain must not still verify as trusted.
  const now = Date.now();
  const isWithinValidity = (validity: { from: Date; to: Date }) =>
    validity.from.getTime() <= now && now <= validity.to.getTime();
  if (
    !isWithinValidity(caCert.tbsCertificate.validity) ||
    !isWithinValidity(deviceCert.tbsCertificate.validity)
  ) {
    return {
      valid: false,
      caPubKey,
      rootPubKey: rootPubKeyMatch,
      deviceCertPubKey,
      error: 'CERTIFICATE_EXPIRED',
    };
  }

  // 2) Device model in the certificate must match the connected device.
  const modelFromSubject = parseModelFromDeviceCertSubject(deviceCert);
  if (modelFromSubject !== deviceModel) {
    return {
      valid: false,
      caPubKey,
      rootPubKey: rootPubKeyMatch,
      deviceCertPubKey,
      error: 'INVALID_DEVICE_MODEL',
    };
  }

  // 3) Device certificate must be signed by the CA pub key.
  const isDeviceCertValid = verifySignatureFn(
    Uint8Array.from(caPubKeyBytes),
    deviceCert.tbsCertificate.asn1.raw,
    deviceCert.signatureValue.bits.bytes
  );
  if (!isDeviceCertValid) {
    return {
      valid: false,
      caPubKey,
      rootPubKey: rootPubKeyMatch,
      deviceCertPubKey,
      error: 'INVALID_DEVICE_CERTIFICATE',
    };
  }

  // 4) The challenge signature must be produced by the device key.
  const isSignatureValid = verifySignatureFn(
    Uint8Array.from(deviceCert.tbsCertificate.subjectPublicKeyInfo.bits.bytes),
    signedData,
    Uint8Array.from(Buffer.from(signature, 'hex'))
  );
  if (!isSignatureValid) {
    return {
      valid: false,
      caPubKey,
      rootPubKey: rootPubKeyMatch,
      deviceCertPubKey,
      error: 'INVALID_DEVICE_SIGNATURE',
    };
  }

  return {
    valid: true,
    caPubKey,
    rootPubKey: rootPubKeyMatch,
    deviceCertPubKey,
    serialNumber: parseSerialNumberFromDeviceCert(deviceCert),
  };
};
