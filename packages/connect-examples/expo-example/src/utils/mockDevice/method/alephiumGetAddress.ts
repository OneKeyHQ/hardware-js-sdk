import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { deriveHDWalletPrivateKey, PrivateKeyWallet } from '@alephium/web3-wallet';
import { NodeProvider } from '@alephium/web3';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

const nodeProvider = new NodeProvider('https://api.testnet.alephium.org');

export default function alephiumGetAddress(
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

  const wallet = new PrivateKeyWallet({
    privateKey: Buffer.from(privateKeyArray).toString('hex'),
    nodeProvider,
  });

  return {
    success: true,
    payload: {
      address: wallet.address,
      path,
    },
  };
}
