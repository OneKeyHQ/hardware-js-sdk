/**
 * Chain fingerprint utilities for device identity verification.
 *
 * Ledger devices have ephemeral IDs that change every session.
 * To verify that the same seed/device is connected, we derive an address
 * at a fixed path (account 0, index 0) and hash it into a stable "chain fingerprint".
 */

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
 * Uses a simple non-cryptographic hash (FNV-1a based) to avoid
 * pulling in a SHA-256 dependency. This is NOT used for security —
 * only for device identity matching.
 */
export function deriveDeviceFingerprint(address: string): string {
  // FNV-1a 64-bit constants (split into two 32-bit halves for JS)
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < address.length; i++) {
    const c = address.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, h2);
    h2 = Math.imul(h2 ^ (c >>> 4), 0x01000193);
  }

  // Mix the two halves for better distribution
  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x45d9f3b);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 0x45d9f3b);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');

  return `${hex1}${hex2}`;
}
