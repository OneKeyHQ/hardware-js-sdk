import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { blake2b } from '@noble/hashes/blake2b';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';
import { addHexPrefix } from '../../hexstring';

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

export default function suiGetAddress(
  connectId: string,
  deviceId: string,
  params: any & {
    mnemonic: string;
    passphrase?: string;
  }
):
  | Unsuccessful
  | Success<{
      address: string;
      path: string;
    }> {
  const { path, mnemonic, passphrase } = params;

  const seed = mnemonicToSeed(mnemonic, passphrase);
  const keyPair = deriveKeyPairWithPath(seed, path, 'ed25519');

  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    return {
      success: false,
      payload: {
        error: 'privateKey or publicKey is undefined',
      },
    };
  }
  const publicKey = Buffer.from(publicKeyArray.slice(1));

  const address = addHexPrefix(publicKeyToAddress(publicKey.toString('hex'))) ?? '';

  return {
    success: true,
    payload: {
      address,
      path,
    },
  };
}
