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

/** Convert a hex string (with or without 0x prefix) to a Uint8Array. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = stripHex(hex);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Convert a Uint8Array to a hex string (no 0x prefix). */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
