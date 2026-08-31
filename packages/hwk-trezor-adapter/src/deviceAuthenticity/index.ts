import { sha3_256 as sha3Hash } from '@noble/hashes/sha3';

import { deviceAuthenticityConfig } from './config';
import { prepareDeviceAuthenticityData, verifyAuthenticityProof } from './verifyAuthenticityProof';

import type { DeviceAuthenticityConfig } from './types';

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
   * True only when every layer implemented by this verifier and required by
   * the explicit model policy verified up to a trusted Trezor root CA AND the
   * device signed our challenge:
   *  - Optiga (all secure-element models), and
   *  - Tropic (T3W1 / Safe 7).
   * This is the currently implemented client policy, not full parity with the
   * latest capability-based Trezor Connect policy. Raw MCU fields remain in the
   * returned proof but are not yet a client-side pass/fail condition.
   * The reward backend must independently verify the same raw proof under its
   * own versioned policy; this client result is only a UX preview.
   */
  verified: boolean;
  /**
   * SHA3-256 of the verified Optiga device-attestation public key. It survives
   * wipe/recovery and has one representation across supported models. Do NOT
   * trust it when `verified` is false — it is then attacker-controlled.
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

export const getRequiredDeviceAuthenticityLayers = (
  deviceModel: string
): readonly ('optiga' | 'tropic')[] => (deviceModel === 'T3W1' ? ['optiga', 'tropic'] : ['optiga']);

const isTropicExpected = (deviceModel: string): boolean =>
  getRequiredDeviceAuthenticityLayers(deviceModel).includes('tropic');

const matchedDebugKey = (
  config: DeviceAuthenticityConfig,
  deviceModel: string,
  rootPubKey?: string
): boolean => {
  if (!rootPubKey) return false;
  const m = modelConfigOf(config, deviceModel);
  if (!m?.debug) return false;
  return [...(m.debug.rootPubKeysOptiga ?? []), ...(m.debug.rootPubKeysTropic ?? [])].includes(
    rootPubKey
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
    const { optiga_certificates: optigaCertificates, optiga_signature: optigaSignature } = proof;
    if (!optigaSignature || !optigaCertificates?.length) {
      return { verified: false, error: 'RESPONSE_PAYLOAD_MISSING' };
    }
    const optiga = verifyAuthenticityProof({
      ...common,
      proofType: 'optiga',
      certificates: optigaCertificates,
      signature: optigaSignature,
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

    // 2) Trezor Connect requires the independent Tropic proof on T3W1.
    let usedDebugKey = matchedDebugKey(config, deviceModel, optiga.rootPubKey);
    if (isTropicExpected(deviceModel)) {
      const { tropic_certificates: tropicCertificates, tropic_signature: tropicSignature } = proof;
      if (!tropicSignature || !tropicCertificates?.length) {
        return { verified: false, error: 'RESPONSE_PAYLOAD_MISSING' };
      }
      const tropic = verifyAuthenticityProof({
        ...common,
        proofType: 'tropic',
        certificates: tropicCertificates,
        signature: tropicSignature,
      });
      if (!tropic.valid) {
        return { verified: false, error: tropic.error };
      }
      usedDebugKey = usedDebugKey || matchedDebugKey(config, deviceModel, tropic.rootPubKey);
    }

    const deviceId = Buffer.from(
      sha3Hash(Uint8Array.from(Buffer.from(optiga.deviceCertPubKey, 'hex')))
    ).toString('hex');

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
