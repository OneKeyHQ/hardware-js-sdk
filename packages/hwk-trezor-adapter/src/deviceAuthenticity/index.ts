import { sha256 } from '@noble/hashes/sha256';

import { deviceAuthenticityConfig } from './config';
import { prepareDeviceAuthenticityData, verifyAuthenticityProof } from './verifyAuthenticityProof';

import type { DeviceAuthenticityConfig, VerifyAuthenticityProofResult } from './types';

export { deviceAuthenticityConfig } from './config';
export { prepareDeviceAuthenticityData, verifyAuthenticityProof } from './verifyAuthenticityProof';
export * from './types';

/** Raw fields taken from a Trezor `AuthenticityProof` message. */
export type AuthenticityProof = {
  optiga_certificates: string[];
  optiga_signature: string;
  tropic_certificates?: string[];
  tropic_signature?: string;
  mcu_certificates?: string[];
  mcu_signature?: string;
};

export type AuthenticateDeviceResult = {
  /**
   * True only when EVERY required attestation layer for this model verified up
   * to a trusted Trezor root CA AND the device signed our challenge:
   *  - Optiga (all secure-element models), and
   *  - Tropic + matching serial number (T3W1 and above).
   * ML-DSA / MCU is NOT checked (needs @noble/post-quantum). Only a `true`
   * value may be trusted as a genuine, uniquely-identified physical device.
   */
  verified: boolean;
  /**
   * Stable per-device identifier: the X.509 serial number (OID 2.5.4.5) when
   * present (T3W1+), otherwise the SHA-256 of the device attestation public key.
   * Survives wipe/recovery and cannot be forged from a seed. Do NOT trust when
   * `verified` is false — it is then attacker-controlled.
   */
  deviceId?: string;
  /** Raw device attestation public key (hex) from the Optiga device certificate. */
  deviceCertPubKey?: string;
  /** X.509 subject serial number (hex), only present on T3W1 and above. */
  serialNumber?: string;
  rootPubKey?: string;
  caPubKey?: string;
  /**
   * True when the chain matched a DEBUG/staging root key (simulator / dev
   * device). A production accounting flow must reject verified results that
   * have `usedDebugKey === true`.
   */
  usedDebugKey?: boolean;
  /** Failure reason when `verified` is false. */
  error?: string;
};

// Revocation hook: CA public keys (hex) that must be rejected even if otherwise
// valid. Empty today; kept so a leaked intermediate CA can be blocked by config
// rather than a code change. Mirrors @trezor/device-authenticity's blacklist.
export const caPubKeyBlacklist: string[] = [];

const modelConfigOf = (config: DeviceAuthenticityConfig, deviceModel: string) => {
  const modelConfig = config[deviceModel];
  return modelConfig && typeof modelConfig !== 'number' ? modelConfig : undefined;
};

const isTropicExpected = (
  config: DeviceAuthenticityConfig,
  deviceModel: string,
  allowDebugKeys?: boolean,
): boolean => {
  const m = modelConfigOf(config, deviceModel);
  if (!m) return false;
  return (
    (m.rootPubKeysTropic?.length ?? 0) > 0 ||
    (!!allowDebugKeys && (m.debug?.rootPubKeysTropic?.length ?? 0) > 0)
  );
};

const matchedDebugKey = (
  config: DeviceAuthenticityConfig,
  deviceModel: string,
  rootPubKey?: string,
): boolean => {
  if (!rootPubKey) return false;
  const m = modelConfigOf(config, deviceModel);
  if (!m?.debug) return false;
  return [...(m.debug.rootPubKeysOptiga ?? []), ...(m.debug.rootPubKeysTropic ?? [])].includes(
    rootPubKey,
  );
};

/**
 * Verify a Trezor `AuthenticityProof` against a challenge and derive a stable
 * per-device id. `challenge` must be the exact random bytes sent in the
 * `AuthenticateDevice` request. Never throws — malformed input from a malicious
 * device is folded into `{ verified: false }`.
 */
export const authenticateDeviceFromProof = ({
  proof,
  challenge,
  deviceModel,
  config = deviceAuthenticityConfig,
  allowDebugKeys,
}: {
  proof: AuthenticityProof;
  challenge: Buffer;
  deviceModel: string;
  config?: DeviceAuthenticityConfig;
  allowDebugKeys?: boolean;
}): AuthenticateDeviceResult => {
  try {
    const signedData = prepareDeviceAuthenticityData({ payload: challenge });
    const common = { signedData, deviceModel, config, allowDebugKeys, caPubKeyBlacklist };

    // 1) Optiga is required on every attestation-capable model.
    const { optiga_certificates, optiga_signature } = proof;
    if (!optiga_signature || !optiga_certificates?.length) {
      return { verified: false, error: 'RESPONSE_PAYLOAD_MISSING' };
    }
    const optiga = verifyAuthenticityProof({
      ...common,
      certificates: optiga_certificates,
      signature: optiga_signature,
    });
    if (!optiga.valid) {
      return {
        verified: false,
        deviceCertPubKey: optiga.deviceCertPubKey,
        caPubKey: optiga.caPubKey,
        rootPubKey: optiga.rootPubKey,
        error: optiga.error,
      };
    }

    // 2) On T3W1+ the Tropic layer is also required, and its serial number must
    // match Optiga's. This defeats a transplanted-Optiga forgery: an attacker
    // moving a genuine Optiga onto a fake board cannot also satisfy Tropic.
    let usedDebugKey = matchedDebugKey(config, deviceModel, optiga.rootPubKey);
    if (isTropicExpected(config, deviceModel, allowDebugKeys)) {
      const { tropic_certificates, tropic_signature } = proof;
      if (!tropic_signature || !tropic_certificates?.length) {
        return { verified: false, error: 'RESPONSE_PAYLOAD_MISSING' };
      }
      const tropic = verifyAuthenticityProof({
        ...common,
        certificates: tropic_certificates,
        signature: tropic_signature,
      });
      if (!tropic.valid) {
        return { verified: false, error: tropic.error };
      }
      const serialsPresent = !!optiga.serialNumber && !!tropic.serialNumber;
      if (!serialsPresent || optiga.serialNumber !== tropic.serialNumber) {
        return { verified: false, error: 'SERIAL_NUMBER_MISMATCH' };
      }
      usedDebugKey =
        usedDebugKey || matchedDebugKey(config, deviceModel, tropic.rootPubKey);
    }

    const deviceId =
      optiga.serialNumber ??
      Buffer.from(sha256(Uint8Array.from(Buffer.from(optiga.deviceCertPubKey, 'hex')))).toString(
        'hex',
      );

    return {
      verified: true,
      deviceId,
      deviceCertPubKey: optiga.deviceCertPubKey,
      serialNumber: optiga.serialNumber,
      rootPubKey: optiga.rootPubKey,
      caPubKey: optiga.caPubKey,
      usedDebugKey,
    };
  } catch (error) {
    // A malicious device can return a malformed certificate that throws deep in
    // the parser; never let that escape as a rejected promise.
    return {
      verified: false,
      error: `RESPONSE_MALFORMED: ${(error as Error)?.message ?? 'parse error'}`,
    };
  }
};

// re-export for callers that want the low-level result shape
export type { VerifyAuthenticityProofResult };
