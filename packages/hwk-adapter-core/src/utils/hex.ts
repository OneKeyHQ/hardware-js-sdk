import { bytesToHex as nobleBytesToHex, hexToBytes as nobleHexToBytes } from '@noble/hashes/utils';

/** Ensure hex string has 0x prefix */
export function ensure0x(hex: string): string {
  return hex.startsWith('0x') ? hex : `0x${hex}`;
}

/** Strip 0x prefix from hex string */
export function stripHex(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2) : hex;
}

/** Pad hex to 64 chars (32 bytes) with 0x prefix */
export function padHex64(hex: string): string {
  return `0x${stripHex(hex).padStart(64, '0')}`;
}

/**
 * Convert a hex string (with or without 0x prefix) to a Uint8Array.
 * Throws on invalid hex (non-hex characters, odd length).
 */
export function hexToBytes(hex: string): Uint8Array {
  return nobleHexToBytes(stripHex(hex));
}

/** Convert a Uint8Array to a hex string (no 0x prefix). */
export function bytesToHex(bytes: Uint8Array): string {
  return nobleBytesToHex(bytes);
}
