import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import TonWeb from 'tonweb';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

export default async function tonGetAddress(
  connectId: string,
  deviceId: string,
  params: any & {
    mnemonic: string;
    passphrase?: string;
    walletVersion: number;
    isBounceable: boolean;
    isTestnetOnly: boolean;
    workchain: number;
    walletId: number;
  }
): Promise<
  | Unsuccessful
  | Success<{
      address: string;
      path: string;
    }>
> {
  const { path, mnemonic, passphrase, walletVersion, isBounceable, isTestnetOnly } = params;

  const seed = mnemonicToSeed(mnemonic, passphrase);
  const keyPair = deriveKeyPairWithPath(seed, path, 'ed25519');

  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    return {
      success: false,
      payload: {
        error: 'privateKey or publicKey is undefined',
      },
    };
  }
  const publicKey = Buffer.from(publicKeyArray.slice(1));

  let contractVersion: keyof typeof TonWeb.Wallets.all = 'v4R2';
  switch (walletVersion) {
    case 0:
      contractVersion = 'v3R1';
      break;
    case 1:
      contractVersion = 'v3R2';
      break;
    case 2:
      contractVersion = 'v4R1';
      break;
    case 3:
      contractVersion = 'v4R2';
      break;
    default:
      contractVersion = 'v4R2';
  }

  const wallet = new TonWeb.Wallets.all[contractVersion](undefined as any, {
    publicKey,
  });
  const address = await wallet.getAddress();

  const nonBounceableAddress = address.toString(true, true, isBounceable, isTestnetOnly);

  console.log('addressString', nonBounceableAddress);

  return {
    success: true,
    payload: {
      address: nonBounceableAddress,
      path,
    },
  };
}
