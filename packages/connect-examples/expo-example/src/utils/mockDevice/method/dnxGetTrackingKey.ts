import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

import { fastHash, generateKeys } from './menero/crypto-util.js';
import { getConfig } from './menero/config.js';
import { encodeVarint } from './menero/helpers';

export default function dnxGetTrackingKey(
  connectId: string,
  deviceId: string,
  params: any & {
    mnemonic: string;
    passphrase?: string;
  }
):
  | Unsuccessful
  | Success<{
      trackingKey: string;
      path: string;
    }> {
  const { path, mnemonic, passphrase } = params;

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

  const privateKey = Buffer.from(privateKeyArray);
  const publicKey = Buffer.from(publicKeyArray);

  console.log('privateKey', privateKey.toString('hex'));
  console.log('publicKey', publicKey.toString('hex'));

  const { sec: secretSpendKey, pub: publicSpendKey } = generateKeys(privateKey);

  console.log('secretSpendKey', secretSpendKey.toString('hex'));
  console.log('publicSpendKey', publicSpendKey.toString('hex'));

  // supports only deterministic wallet
  const { sec: secretViewKey, pub: publicViewKey } = generateKeys(fastHash(secretSpendKey));

  console.log('secretViewKey', secretViewKey.toString('hex'));
  console.log('publicViewKey', publicViewKey.toString('hex'));

  const trackingKey = Buffer.concat([
    publicSpendKey,
    publicViewKey,
    // 32 0x00 bytes
    Buffer.alloc(32),
    secretViewKey,
  ]);

  console.log('trackingKey', trackingKey.toString('hex'));

  return {
    success: true,
    payload: {
      trackingKey: trackingKey.toString('hex'),
      path,
    },
  };
}
