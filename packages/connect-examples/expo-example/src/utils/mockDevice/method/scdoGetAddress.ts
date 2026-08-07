import { bytesToHex } from '@noble/hashes/utils';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { encode as rlpEncode } from 'rlp';
import { getPublicKey } from '@noble/secp256k1';

import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

import type { Success, Unsuccessful } from '@onekeyfe/hd-core';

const SCDO_ADDRESS_LENGTH = 20;
const SHARD_NUM = 4;

function publicKeyToAddress(publicKey: Uint8Array, shard = 1): string {
  if (shard < 1 || shard > SHARD_NUM) {
    throw new Error('无效的分片号');
  }

  const rlpEncodedPubKey = rlpEncode(publicKey);
  const hash = keccak256(rlpEncodedPubKey);
  const address = new Uint8Array(SCDO_ADDRESS_LENGTH);
  address.set(hash.slice(-SCDO_ADDRESS_LENGTH));

  // 设置分片号和标志位
  address[0] = shard;
  // eslint-disable-next-line no-bitwise
  address[SCDO_ADDRESS_LENGTH - 1] = (address[SCDO_ADDRESS_LENGTH - 1] & 0xf0) | 1;

  return `${shard}S${bytesToHex(address)}`;
}

/**
 * 抽离的核心逻辑：从 seed 生成 SCDO 地址
 * 可以被 SLIP39 直接调用，避免助记词转换
 */
export function generateScdoAddressFromSeed(seed: Buffer, path: string, shard = 1): string {
  const keyPair = deriveKeyPairWithPath(seed, path, 'secp256k1');
  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    throw new Error('privateKey or publicKey is undefined');
  }

  const publicKey = getPublicKey(privateKeyArray, false).slice(1);
  return publicKeyToAddress(publicKey, shard);
}

export default function scdoGetAddress(
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
    const address = generateScdoAddressFromSeed(seed, path);
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
