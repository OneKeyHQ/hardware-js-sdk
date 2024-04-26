import { mnemonicToSeedSync } from 'bip39';
import BIP32Factory from 'bip32';
import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { base58xmr, utils } from '@scure/base';
import { keccak_256 as keccak } from '@noble/hashes/sha3';
import eccObj from '../ecc';

import { fastHash, generateKeys } from './menero/crypto-util.js';
import { getConfig } from './menero/config.js';

const bip32Obj = BIP32Factory(eccObj);

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

  const seed = mnemonicToSeedSync(mnemonic, passphrase);
  const master = bip32Obj.fromSeed(seed);

  const keyPair = master.derivePath(path);

  const { privateKey, publicKey } = keyPair;

  const { sec: secretSpendKey, pub: publicSpendKey } = generateKeys(privateKey);
  // supports only deterministic wallet
  const { sec: secretViewKey, pub: publicViewKey } = generateKeys(fastHash(secretSpendKey));

  const config = getConfig('dnxmainnet');
  const rawAddress = Buffer.concat([
    config.CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX,
    publicSpendKey,
    publicViewKey,
  ]);

  const address = base58xmrCheck(config.ADDRESS_CHECKSUM_SIZE).encode(rawAddress);

  return {
    success: true,
    payload: {
      address,
      path,
    },
  };
}
