import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { PrivateKeyWallet } from '@alephium/web3-wallet';
import { NodeProvider, groupOfAddress } from '@alephium/web3';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

const nodeProvider = new NodeProvider('https://api.mainnet.alephium.org');

/**
 * 抽离的核心逻辑：从 seed 生成 Alephium 地址
 * 可以被 SLIP39 直接调用，避免助记词转换
 */
export function generateAlephiumAddressFromSeed(
  seed: Buffer,
  path: string,
  group: number
): { address: string; derivedPath: string } {
  const [pathPrefix, lastIndex] = getPathParts(path);
  let pathIndex = lastIndex;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const relativePath = `${pathPrefix}/${pathIndex}`;
    const { address, success, error } = deriveAddress(seed, relativePath);

    if (!success) {
      throw new Error(error || 'Failed to derive Alephium address');
    }

    if (groupOfAddress(address) === group) {
      return { address, derivedPath: relativePath };
    }

    pathIndex++;

    // 防止无限循环
    if (pathIndex > lastIndex + 1000) {
      throw new Error(`Could not find address for group ${group} after 1000 attempts`);
    }
  }
}

export default function alephiumGetAddress(
  connectId: string,
  deviceId: string,
  params: {
    mnemonic: string;
    passphrase?: string;
    group: number;
    path: string;
  }
): Unsuccessful | Success<{ address: string; path: string; derivedPath: string }> {
  const { path, mnemonic, passphrase, group } = params;
  const seed = mnemonicToSeed(mnemonic, passphrase);

  try {
    const result = generateAlephiumAddressFromSeed(seed, path, group);
    return {
      success: true,
      payload: { address: result.address, path, derivedPath: result.derivedPath },
    };
  } catch (error) {
    return {
      success: false,
      payload: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

function getPathParts(path: string): [string, number] {
  const pathArray = path.split('/');
  const pathPrefix = pathArray.slice(0, -1).join('/');
  const lastIndex = parseInt(pathArray.pop() || '0', 10);
  return [pathPrefix, lastIndex];
}

function deriveAddress(
  seed: Buffer,
  path: string
): { address: string; success: boolean; error?: string } {
  const keyPair = deriveKeyPairWithPath(seed, path, 'secp256k1');

  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    return { address: '', success: false, error: 'privateKey or publicKey is undefined' };
  }

  const wallet = new PrivateKeyWallet({
    privateKey: Buffer.from(privateKeyArray).toString('hex'),
    nodeProvider,
  });

  return { address: wallet.address, success: true };
}
