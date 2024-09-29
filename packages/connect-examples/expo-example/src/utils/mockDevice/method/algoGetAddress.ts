import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { sha512_256 as sha512 } from '@noble/hashes/sha512';
import { base32 } from '@scure/base';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

const ALGORAND_ADDRESS_BYTE_LENGTH = 36;
const ALGORAND_CHECKSUM_BYTE_LENGTH = 4;
const ALGORAND_ADDRESS_LENGTH = 58;
const ALGORAND_PUBLIC_KEY_LENGTH = 32;

function publicKeyToAddress(publicKey: Uint8Array): string {
  const checksum = sha512(publicKey).slice(
    ALGORAND_PUBLIC_KEY_LENGTH - ALGORAND_CHECKSUM_BYTE_LENGTH,
    ALGORAND_PUBLIC_KEY_LENGTH
  );
  console.log('checksum', checksum);

  // publicKey + checksum
  const concat = new Uint8Array([...publicKey, ...checksum]);
  const addr = base32.encode(concat);
  console.log('addr', addr);
  return addr.toString().slice(0, ALGORAND_ADDRESS_LENGTH);
}

export default function algoGetAddress(
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

  const publicKey = publicKeyArray.slice(1);
  const address = publicKeyToAddress(publicKey);

  return {
    success: true,
    payload: {
      address,
      path,
    },
  };
}
