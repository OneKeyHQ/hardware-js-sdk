/* eslint-disable no-bitwise */
import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { encodeAccountID } from 'ripple-address-codec';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { sha256 } from '@noble/hashes/sha256';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

function publicKeyToAddress(publicKey: Uint8Array): string {
  const pub = bytesToHex(publicKey).toUpperCase();
  return encodeAccountID(ripemd160(sha256(hexToBytes(pub)))).toString();
}

/**
 * 抽离的核心逻辑：从 seed 生成 XRP 地址
 * 可以被 SLIP39 直接调用，避免助记词转换
 */
export function generateXrpAddressFromSeed(seed: Buffer, path: string): string {
  const keyPair = deriveKeyPairWithPath(seed, path, 'secp256k1');
  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    throw new Error('privateKey or publicKey is undefined');
  }

  return publicKeyToAddress(publicKeyArray);
}

export default function xrpGetAddress(
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
    const address = generateXrpAddressFromSeed(seed, path);
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
