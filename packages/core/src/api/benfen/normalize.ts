import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { blake2b } from '@noble/hashes/blake2b';

export const BENFEN_ADDRESS_LENGTH = 32;
export const PUBLIC_KEY_SIZE = 32;

export const SIGNATURE_SCHEME_TO_FLAG = {
  ED25519: 0x00,
};

export function normalizeBenfenAddress(value: string, forceAdd0x = false): string {
  let address = value.toLowerCase();
  if (!forceAdd0x && address.startsWith('0x')) {
    address = address.slice(2);
  }
  return `0x${address.padStart(BENFEN_ADDRESS_LENGTH * 2, '0')}`.toLowerCase();
}

export function publicKeyToAddress(publicKey: string) {
  const tmp = new Uint8Array(PUBLIC_KEY_SIZE + 1);
  tmp.set([SIGNATURE_SCHEME_TO_FLAG.ED25519]);
  tmp.set(hexToBytes(publicKey), 1);

  return normalizeBenfenAddress(
    bytesToHex(blake2b(tmp, { dkLen: 32 })).slice(0, BENFEN_ADDRESS_LENGTH * 2)
  );
}
