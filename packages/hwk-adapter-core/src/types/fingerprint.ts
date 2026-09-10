/**
 * Chain fingerprint utilities for device identity verification.
 *
 * Ledger devices have ephemeral IDs that change every session.
 * To verify that the same seed/device is connected, we derive an address
 * at a fixed path (account 0, index 0) and hash it into a stable "chain fingerprint".
 */
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

/**
 * Fixed derivation paths used to generate chain fingerprints.
 * Uses standard index 0 — Ledger firmware shows device confirmation for
 * non-standard paths (e.g., index=100), which would interrupt wallet creation.
 * The address is hashed into a 16-char fingerprint, not exposed directly.
 * - EVM: cointype 60 (Ledger ETH App only supports 60)
 * - BTC: cointype 1 (testnet)
 * - SOL: cointype 501, standard 3-level hardened
 */
export const CHAIN_FINGERPRINT_PATHS: Record<ChainForFingerprint, string> = {
  evm: "m/44'/60'/0'/0/0",
  // BTC: account-level path (3 levels), mainnet cointype 0.
  // Cointype 1 (testnet) is rejected by some Ledger BTC App configurations.
  btc: "m/44'/0'/0'",
  sol: "m/44'/501'/0'",
  tron: "m/44'/195'/0'/0/0",
  // Shielded UA (single Orchard receiver) derived from the transparent path.
  zcash: "m/44'/133'/0'/0/0",
};

export type ChainForFingerprint = 'evm' | 'btc' | 'sol' | 'tron' | 'zcash';

/**
 * Parses the complete BIP32 master fingerprint wire value: 4 bytes encoded
 * as exactly 8 hexadecimal characters. This is protocol metadata, not a
 * collision-resistant wallet identity.
 */
export function parseBip32MasterFingerprint(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{8}$/.test(normalized) ? normalized : undefined;
}

/**
 * 16-char SHA-256 fingerprint for device-identity verification.
 * Callers must canonicalize input (e.g. EVM address → lowercase) —
 * encoding variations otherwise cause false DeviceMismatch.
 */
export function deriveDeviceFingerprint(value: string): string {
  return bytesToHex(sha256(utf8ToBytes(value))).slice(0, 16);
}

/**
 * Stable 256-bit wallet identity derived from canonical public wallet
 * material. The domain separator prevents the same input from being confused
 * with hashes used by other SDK features.
 *
 * Callers must provide one fixed, vendor-defined identity source. Do not hash
 * a variable subset of exported accounts: the same wallet would then receive
 * different ids depending on which accounts happened to be returned.
 */
export function deriveWalletId(canonicalPublicMaterial: string): string {
  return bytesToHex(sha256(utf8ToBytes(`onekey-hwk-wallet-id:v1:${canonicalPublicMaterial}`)));
}
