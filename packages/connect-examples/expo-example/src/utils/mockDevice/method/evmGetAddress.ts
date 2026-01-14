import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';
import { getPublicKey } from '@noble/secp256k1';

import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

import type { Success, Unsuccessful } from '@onekeyfe/hd-core';

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

/**
 * 抽离的核心逻辑：从 seed 生成 EVM 地址
 * 可以被 SLIP39 直接调用，避免助记词转换
 */
export function generateEvmAddressFromSeed(seed: Buffer, path: string): string {
  const keyPair = deriveKeyPairWithPath(seed, path);
  const { privateKey } = keyPair;

  if (!privateKey) {
    throw new Error('privateKey is undefined');
  }

  const publicKey = getPublicKey(privateKey, false);
  const hash = bytesToHex(keccak256(publicKey.slice(1)));
  const address = `0x${hash.slice(-40)}`;

  return toChecksumAddress(address);
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
  const seed = mnemonicToSeed(mnemonic, passphrase);

  try {
    const address = generateEvmAddressFromSeed(seed, path);
    return {
      success: true,
      payload: { address, path },
    };
  } catch (error) {
    return {
      success: false,
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
