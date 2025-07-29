import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { base58xmr, utils } from '@scure/base';
import { keccak_256 as keccak } from '@noble/hashes/sha3';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

import { fastHash, generateKeys } from './menero/crypto-util.js';
import { getConfig } from './menero/config.js';
import { encodeVarint } from './menero/helpers';

function base58xmrCheck(checksumSize: number) {
  return utils.chain(
    utils.checksum(checksumSize, data => keccak(data)),
    base58xmr
  );
}

/**
 * 抽离的核心逻辑：从 seed 生成 DNX 地址
 * 可以被 SLIP39 直接调用，避免助记词转换
 */
export function generateDnxAddressFromSeed(seed: Buffer, path: string): string {
  const keyPair = deriveKeyPairWithPath(seed, path, 'ed25519');
  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    throw new Error('privateKey or publicKey is undefined');
  }

  const privateKey = Buffer.from(privateKeyArray);
  const publicKey = Buffer.from(publicKeyArray);

  const { sec: secretSpendKey, pub: publicSpendKey } = generateKeys(privateKey);
  const { sec: secretViewKey, pub: publicViewKey } = generateKeys(fastHash(secretSpendKey));

  const config = getConfig('dnxmainnet');
  const rawAddress = Buffer.concat([
    encodeVarint(config.CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX[0]) as any,
    publicSpendKey,
    publicViewKey,
  ]);

  return base58xmrCheck(config.ADDRESS_CHECKSUM_SIZE).encode(rawAddress as any);
}

export default function dnxGetAddress(
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
    const address = generateDnxAddressFromSeed(seed, path);
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
