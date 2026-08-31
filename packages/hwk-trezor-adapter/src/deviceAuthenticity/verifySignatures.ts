import { ed25519 } from '@noble/curves/ed25519';
import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';

import { type AlgorithmName, fixSignature } from './x509certificate';

export type VerifySignature = (
  rawKey: Uint8Array,
  data: Uint8Array,
  signature: Uint8Array
) => boolean;

// P-256 (secp256r1) ECDSA over SHA-256. Hardware attestation signatures are NOT
// guaranteed to be low-S normalized, so lowS must be disabled or valid signatures
// would be rejected. `fixSignature` repairs the 1-in-256 malformed Optiga DER encoding.
export const verifySignatureP256: VerifySignature = (rawKey, data, signature) => {
  try {
    const sig = p256.Signature.fromDER(Buffer.from(fixSignature(signature)).toString('hex'));

    return p256.verify(sig.toBytes('compact'), sha256(data), rawKey, { lowS: false });
  } catch {
    // invalid inputs (e.g. an Ed25519 signature with a P-256 key) are an
    // unsuccessful verification, not a runtime error
    return false;
  }
};

export const verifySignatureEd25519: VerifySignature = (rawKey, data, signature) => {
  try {
    return ed25519.verify(signature, data, rawKey);
  } catch {
    return false;
  }
};

export const getVerifyFn = (algorithmName: AlgorithmName): VerifySignature => {
  if (algorithmName === 'P-256') return verifySignatureP256;
  if (algorithmName === 'Ed25519') return verifySignatureEd25519;
  throw new Error(`Unsupported signature algorithm: ${algorithmName}`);
};
