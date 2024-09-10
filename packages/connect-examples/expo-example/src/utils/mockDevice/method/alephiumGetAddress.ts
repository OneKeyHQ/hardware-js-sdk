import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { PrivateKeyWallet } from '@alephium/web3-wallet';
import { NodeProvider, groupOfAddress } from '@alephium/web3';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

const nodeProvider = new NodeProvider('https://api.mainnet.alephium.org');

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

  const [pathPrefix, lastIndex] = getPathParts(path);
  let pathIndex = lastIndex;

  while (true) {
    const relativePath = `${pathPrefix}/${pathIndex}`;
    const { address, success, error } = deriveAddress(seed, relativePath);

    if (!success) {
      return { success: false, payload: { error: error || 'unknown error' } };
    }

    if (groupOfAddress(address) === group) {
      return {
        success: true,
        payload: { address, path, derivedPath: relativePath },
      };
    }

    pathIndex++;
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
