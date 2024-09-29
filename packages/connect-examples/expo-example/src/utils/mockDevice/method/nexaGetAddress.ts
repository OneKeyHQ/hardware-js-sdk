/* eslint-disable no-bitwise */
import type { NexaGetAddressParams, Success, Unsuccessful } from '@onekeyfe/hd-core';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { encodeAddress } from '@nexajs/address';
import { encodeDataPush, OP } from '@nexajs/script';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

enum ENexaAddressType {
  PayToPublicKeyHash = 'P2PKH',
  PayToScriptHash = 'SCRIPT',
  PayToScriptTemplate = 'TEMPLATE',
  GroupedPayToPublicKeyTemplate = 'GROUP',
}

function publicKeyToAddress(publicKey: Uint8Array, prefix: string): string {
  const scriptPushPubKey = encodeDataPush(publicKey);
  const sha256Hash = sha256(scriptPushPubKey);
  const ripemd160Hash = ripemd160(sha256Hash);

  const scriptPubKey = new Uint8Array([OP.ZERO, OP.ONE, ...encodeDataPush(ripemd160Hash)]);

  //   const scriptPubKey = new Uint8Array([0x17, 0x00, 0x51, 0x14, ...ripemd160Hash]);
  return encodeAddress(prefix, ENexaAddressType.PayToScriptTemplate, Buffer.from(scriptPubKey));
}

export default function nexaGetAddress(
  connectId: string,
  deviceId: string,
  params: NexaGetAddressParams & {
    mnemonic: string;
    passphrase?: string;
  }
):
  | Unsuccessful
  | Success<{
      address: string;
      path: string;
    }> {
  const { path, mnemonic, passphrase, prefix } = params;

  const seed = mnemonicToSeed(mnemonic, passphrase);
  // @ts-expect-error
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

  const address = publicKeyToAddress(publicKeyArray, prefix ?? 'nexa');

  return {
    success: true,
    payload: {
      address,
      // @ts-expect-error
      path,
    },
  };
}
