import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { blake2b } from '@noble/hashes/blake2b';

export const SUI_ADDRESS_LENGTH = 32;
export const PUBLIC_KEY_SIZE = 32;

export const SIGNATURE_SCHEME_TO_FLAG = {
  ED25519: 0x00,
  Secp256k1: 0x01,
};

export function normalizeSuiAddress(value: string, forceAdd0x = false): string {
  let address = value.toLowerCase();
  if (!forceAdd0x && address.startsWith('0x')) {
    address = address.slice(2);
  }
  return `0x${address.padStart(SUI_ADDRESS_LENGTH * 2, '0')}`.toLowerCase();
}

export function publicKeyToAddress(publicKey: string) {
  const tmp = new Uint8Array(PUBLIC_KEY_SIZE + 1);
  tmp.set([SIGNATURE_SCHEME_TO_FLAG.ED25519]);
  tmp.set(hexToBytes(publicKey), 1);

  return normalizeSuiAddress(
    bytesToHex(blake2b(tmp, { dkLen: 32 })).slice(0, SUI_ADDRESS_LENGTH * 2)
  );
}
