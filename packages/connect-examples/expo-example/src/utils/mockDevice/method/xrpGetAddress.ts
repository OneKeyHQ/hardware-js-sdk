/* eslint-disable no-bitwise */
import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { bytesToHex } from '@noble/hashes/utils';
import { deriveAddress } from 'xrpl';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

function publicKeyToAddress(publicKey: Uint8Array): string {
  const pub = bytesToHex(publicKey).toUpperCase();
  return deriveAddress(pub);
}

export default function xrpGetAddress(
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

  const address = publicKeyToAddress(publicKeyArray);

  return {
    success: true,
    payload: {
      address,
      path,
    },
  };
}
