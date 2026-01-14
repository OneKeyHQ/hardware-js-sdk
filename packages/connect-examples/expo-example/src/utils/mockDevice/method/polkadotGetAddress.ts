/* eslint-disable no-bitwise */
import { encodeAddress, hdLedger } from '@polkadot/util-crypto';

import { deriveKeyPairWithPath } from '../helper';

import type { PolkadotGetAddressParams } from '@onekeyfe/hd-core';

/**
 * 抽离的核心逻辑：从 seed 生成 Polkadot 地址
 * 可以被 SLIP39 直接调用，使用直接从 master secret 派生的方式
 * 与 OneKey 硬件的实现完全一致
 */
export function generatePolkadotAddressFromSeed(seed: Buffer, path: string, prefix = 0): string {
  // 直接从 SLIP39 master secret 派生，不转换为 BIP39 mnemonic
  // 这与 OneKey 硬件设备的实现完全一致：master secret → HDNode → ed25519 keypair

  // 使用 ed25519 曲线进行密钥派生
  const keyPair = deriveKeyPairWithPath(seed, path, 'ed25519');

  // 获取公钥并编码为 Polkadot 地址
  // Polkadot 需要32字节的原始公钥（去掉算法前缀）
  const rawPublicKey = keyPair.publicKey?.slice(1);
  if (!rawPublicKey) {
    throw new Error('Failed to derive public key');
  }

  return encodeAddress(rawPublicKey as any, prefix);
}

/**
 * 从助记词生成 Polkadot 地址（bip39）
 */
export function generatePolkadotAddressFromMnemonic(
  mnemonic: string,
  path: string,
  prefix = 0,
  passphrase = ''
): string {
  const secret = hdLedger(mnemonic, path, passphrase);
  return encodeAddress(secret.publicKey, prefix);
}

export default function polkadotGetAddress(
  _connectId: string,
  _deviceId: string,
  params: PolkadotGetAddressParams & {
    mnemonic: string;
    passphrase?: string;
  }
) {
  const { path, prefix = 0, mnemonic, passphrase = '' } = params;

  try {
    // 确保 path 是字符串格式
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    // 使用抽离的函数，先转换助记词为seed
    const address = generatePolkadotAddressFromMnemonic(mnemonic, pathStr, prefix, passphrase);

    return {
      success: true,
      payload: {
        address,
        path,
      },
    };
  } catch (error) {
    return {
      success: false,
      payload: {
        error: `Failed to generate Polkadot address: ${error}`,
      },
    };
  }
}
