import BIP32Factory from 'bip32';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { mnemonicToSeedSync } from 'bip39';
import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { bytesToHex } from '@noble/hashes/utils';
import { getPublicKey } from '@noble/secp256k1';
import eccObj from '../ecc';

const bip32Obj = BIP32Factory(eccObj);

// EIP-55
function toChecksumAddress(address: string) {
  const formatAddress = address.toLowerCase().replace('0x', '');
  const hash = bytesToHex(keccak256(formatAddress));

  let checksumAddress = '0x';

  for (let i = 0; i < formatAddress.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      checksumAddress += formatAddress[i].toUpperCase();
    } else {
      checksumAddress += formatAddress[i];
    }
  }

  return checksumAddress;
}

export default function evmGetAddress(
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

  const { privateKey } = keyPair;

  if (!privateKey) {
    return {
      success: false,
      payload: {
        error: 'privateKey is undefined',
      },
    };
  }

  const publicKey = getPublicKey(privateKey, false);
  const hash = bytesToHex(keccak256(publicKey.slice(1)));
  const address = `0x${hash.slice(-40)}`;

  return {
    success: true,
    payload: {
      address: toChecksumAddress(address),
      path,
    },
  };
}
