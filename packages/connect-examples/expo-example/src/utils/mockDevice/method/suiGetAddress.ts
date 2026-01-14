import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { blake2b } from '@noble/hashes/blake2b';

import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';
import { addHexPrefix } from '../../hexstring';

import type { Success, Unsuccessful } from '@onekeyfe/hd-core';

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

/**
 * 抽离的核心逻辑：从 seed 生成 Sui 地址
 * 可以被 SLIP39 直接调用，避免助记词转换
 */
export function generateSuiAddressFromSeed(seed: Buffer, path: string): string {
  const keyPair = deriveKeyPairWithPath(seed, path, 'ed25519');
  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    throw new Error('privateKey or publicKey is undefined');
  }

  const publicKey = Buffer.from(publicKeyArray.slice(1));
  const address = addHexPrefix(publicKeyToAddress(publicKey.toString('hex'))) ?? '';

  return address;
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

  try {
    const address = generateSuiAddressFromSeed(seed, path);
    return {
      success: true,
      payload: { address, path },
    };
  } catch (error) {
    return {
      success: false,
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
