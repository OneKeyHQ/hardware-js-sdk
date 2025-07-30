import type { NervosGetAddressParams, Success, Unsuccessful } from '@onekeyfe/hd-core';
import { generateAddress } from '@ckb-lumos/helpers';
import { utils } from '@ckb-lumos/base';
import { getConfig } from '@ckb-lumos/config-manager';
import { bytesToHex } from '@noble/hashes/utils';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';
import { addHexPrefix } from '../../hexstring';

function publicKeyToAddress(publicKey: Uint8Array): string {
  const publicKeyHex = addHexPrefix(bytesToHex(publicKey)) ?? '';
  const blake160 = new utils.CKBHasher().update(publicKeyHex).digestHex().slice(0, 42);

  const config = getConfig();
  const template = config.SCRIPTS.SECP256K1_BLAKE160;

  if (!template) {
    throw new Error('SECP256K1_BLAKE160 not found in config');
  }

  return generateAddress(
    {
      codeHash: template.CODE_HASH,
      hashType: template.HASH_TYPE,
      args: blake160,
    },
    { config }
  );
}

export default function nervosGetAddress(
  connectId: string,
  deviceId: string,
  params: NervosGetAddressParams & {
    mnemonic: string;
    passphrase?: string;
    path: string;
  }
):
  | Unsuccessful
  | Success<{
      address: string;
      path: string;
    }> {
  const { path, mnemonic, passphrase } = params;

  const seed = mnemonicToSeed(mnemonic, passphrase);
  const keyPair = deriveKeyPairWithPath(seed, path, 'secp256k1');

  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    return {
      success: false,
      payload: {
        error: 'privateKey or publicKey is undefined',
      },
    };
  }

  const publicKey = publicKeyArray.slice(1);
  const address = publicKeyToAddress(publicKeyArray);

  return {
    success: true,
    payload: {
      address,
      path,
    },
  };
}

/**
 * 抽离的核心逻辑：从 seed 生成 Nervos 地址
 * 可以被 SLIP39 直接调用，避免助记词转换
 */
export function generateNervosAddressFromSeed(seed: Buffer, path: string): string {
  const keyPair = deriveKeyPairWithPath(seed, path, 'secp256k1');
  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    throw new Error('privateKey or publicKey is undefined');
  }

  const publicKey = publicKeyArray.slice(1);
  return publicKeyToAddress(publicKeyArray);
}
