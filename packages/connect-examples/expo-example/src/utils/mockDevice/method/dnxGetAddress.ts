import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { base58xmr, utils } from '@scure/base';
import { keccak_256 as keccak } from '@noble/hashes/sha3';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

import { fastHash, generateKeys } from './menero/crypto-util.js';
import { getConfig } from './menero/config.js';
import { encodeVarint } from './menero/helpers';

function base58xmrCheck(checksumSize: number) {
  return utils.chain(
    utils.checksum(checksumSize, data => keccak(data)),
    base58xmr
  );
}

export default function dnxGetAddress(
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

  const config = getConfig('dnxmainnet');

  const rawAddress = Buffer.concat([
    // @ts-expect-error
    encodeVarint(config.CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX[0]),
    publicSpendKey,
    publicViewKey,
  ]);

  console.log('rawAddress', rawAddress.toString('hex'));

  const address = base58xmrCheck(config.ADDRESS_CHECKSUM_SIZE).encode(rawAddress);

  return {
    success: true,
    payload: {
      address,
      path,
    },
  };
}
