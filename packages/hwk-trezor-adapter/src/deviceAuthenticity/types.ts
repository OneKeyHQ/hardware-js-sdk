export type CertPubKeys = {
  rootPubKeysOptiga: string[];
  rootPubKeysTropic?: string[];
};

export type ModelPubKeys = CertPubKeys & {
  debug?: CertPubKeys;
};

// Keyed by Device.features.internal_model (e.g. 'T2B1', 'T3B1', 'T3T1', 'T3W1').
export interface DeviceAuthenticityConfig {
  version: number;
  [model: string]: ModelPubKeys | number | undefined;
}

export type VerifyAuthenticityProofParams = {
  /** Binds the proof field to its expected root set and signature algorithm. */
  proofType: 'optiga' | 'tropic';
  certificates: string[];
  signature: string;
  signedData: Uint8Array;
  /** Device.features.internal_model, selects which root CA keys to trust. */
  deviceModel: string;
  config: DeviceAuthenticityConfig;
  allowDebugKeys?: boolean;
  /** CA public keys (hex) to reject even when otherwise valid (revocation). */
  caPubKeyBlacklist?: string[];
};

export type VerifyAuthenticityProofResult =
  | {
      valid: true;
      caPubKey?: string;
      rootPubKey: string;
      error?: undefined;
      /** X.509 subject serial number (OID 2.5.4.5), present on T3W1 and above. */
      serialNumber?: string;
      /** Raw per-device attestation public key from the device certificate (hex). */
      deviceCertPubKey: string;
    }
  | {
      valid: false;
      caPubKey?: string;
      rootPubKey?: string;
      serialNumber?: string;
      deviceCertPubKey?: string;
      error:
        | 'ROOT_PUBKEY_NOT_FOUND'
        | 'INVALID_DEVICE_MODEL'
        | 'INVALID_DEVICE_CERTIFICATE'
        | 'INVALID_DEVICE_SIGNATURE'
        | 'CA_PUBKEY_BLACKLISTED'
        | 'RESPONSE_PAYLOAD_MISSING'
        | 'RESPONSE_MALFORMED'
        | 'UNSUPPORTED_ALGORITHM'
        | 'CERTIFICATE_EXPIRED';
    };
