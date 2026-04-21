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
};

export type ChainForFingerprint = 'evm' | 'btc' | 'sol' | 'tron';

/**
 * Hash an address string into a 16-character hex fingerprint.
 *
 * Uses the first 16 hex chars (64 bits) of SHA-256 — sufficient for
 * device identity matching. Not used for security decisions.
 */
export function deriveDeviceFingerprint(address: string): string {
  return bytesToHex(sha256(utf8ToBytes(address))).slice(0, 16);
}
