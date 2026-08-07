import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { secp256k1 } from '@noble/curves/secp256k1';

function hexToUint8Array(hex: string): Uint8Array {
  const sanitized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (sanitized.length % 2 !== 0) {
    throw new Error('Invalid hex input.');
  }
  const length = sanitized.length / 2;
  const result = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    result[i] = Number.parseInt(sanitized.substr(i * 2, 2), 16);
  }
  return result;
}

export function deriveEvmAddressFromPublicKey(publicKey?: string): string | null {
  if (!publicKey) {
    return null;
  }
  try {
    let pointBytes = hexToUint8Array(publicKey);
    if (pointBytes.length === 33) {
      const point = secp256k1.ProjectivePoint.fromHex(pointBytes);
      pointBytes = point.toRawBytes(false);
    }
    if (pointBytes.length !== 65) {
      return null;
    }
    const hash = keccak256(pointBytes.slice(1));
    const addressBytes = hash.slice(hash.length - 20);
    return `0x${Buffer.from(addressBytes).toString('hex')}`.toLowerCase();
  } catch (error) {
    console.warn('[AirGap] Failed to derive address from public key', error);
    return null;
  }
}
