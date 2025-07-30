import { AptosGetPublicKeyParams } from '@onekeyfe/hd-core';
import { mnemonicToSeed, deriveKeyPairWithPath } from '../helper';

/**
 * 抽离的核心逻辑：从 seed 生成 Aptos 公钥
 * 可以被 SLIP39 直接调用，使用直接从 master secret 派生的方式
 * 与 OneKey 硬件的实现完全一致
 */
export function generateAptosPublicKeyFromSeed(seed: Buffer, path: string): string {
  // 直接从 SLIP39 master secret 派生，不转换为 BIP39 mnemonic
  // 这与 OneKey 硬件设备的实现完全一致：master secret → HDNode → ed25519 keypair
  // Aptos 使用 ed25519，返回32字节原始公钥

  // 使用 ed25519 曲线进行密钥派生
  const keyPair = deriveKeyPairWithPath(seed, path, 'ed25519');

  // 获取原始公钥（32字节，去掉ed25519前缀）
  const { publicKey: publicKeyArray } = keyPair;

  if (!publicKeyArray) {
    throw new Error('Failed to derive public key');
  }

  // 返回32字节原始公钥（去掉第一个字节的算法标识符）
  return Buffer.from(publicKeyArray.slice(1)).toString('hex');
}

export default function aptosGetPublicKey(
  _connectId: string,
  _deviceId: string,
  params: AptosGetPublicKeyParams & {
    mnemonic: string;
    passphrase?: string;
  }
) {
  const { path, mnemonic, passphrase = '' } = params;

  try {
    // 确保 path 是字符串格式
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    // 使用抽离的函数，先转换助记词为seed
    const seed = mnemonicToSeed(mnemonic, passphrase);
    const publicKey = generateAptosPublicKeyFromSeed(seed, pathStr);

    return {
      success: true,
      payload: {
        publicKey,
        path,
      },
    };
  } catch (error) {
    return {
      success: false,
      payload: {
        error: `Failed to generate Aptos public key: ${error}`,
      },
    };
  }
}
