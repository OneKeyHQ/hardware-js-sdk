import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

type NostrGetPublicKeyParams = {
  path: string | string[];
};

/**
 * 抽离的核心逻辑：从 seed 生成 Nostr 公钥
 * 可以被 SLIP39 直接调用，使用直接从 master secret 派生的方式
 * 与 OneKey 硬件的实现完全一致
 */
export function generateNostrPublicKeyFromSeed(seed: Buffer, path: string): string {
  // 直接从 SLIP39 master secret 派生，不转换为 BIP39 mnemonic
  // 这与 OneKey 硬件设备的实现完全一致：master secret → HDNode → secp256k1 keypair
  // Nostr 使用 secp256k1，但返回32字节原始公钥（去掉前缀）

  // 使用 secp256k1 曲线进行密钥派生
  const keyPair = deriveKeyPairWithPath(seed, path, 'secp256k1');

  // 获取原始公钥（32字节，去掉压缩标识符）
  const { publicKey: publicKeyArray } = keyPair;

  if (!publicKeyArray) {
    throw new Error('Failed to derive public key');
  }

  // 返回32字节原始公钥（去掉第一个字节的压缩标识符）
  return Buffer.from(publicKeyArray.slice(1)).toString('hex');
}

export default function nostrGetPublicKey(
  _connectId: string,
  _deviceId: string,
  params: NostrGetPublicKeyParams & {
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
    const publicKey = generateNostrPublicKeyFromSeed(seed, pathStr);

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
        error: `Failed to generate Nostr public key: ${error}`,
      },
    };
  }
}
