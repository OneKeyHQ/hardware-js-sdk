/* eslint-disable no-bitwise */
import { base32 } from '@scure/base';

import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

import type { Success, Unsuccessful } from '@onekeyfe/hd-core';

const STELLAR_VERSION_ACCOUNT = 6 << 3; // 'G' = 0x30

/**
 * CRC16-XModem checksum
 */
function crc16xmodem(data: Uint8Array): number {
  let crc = 0x0000;
  for (let i = 0; i < data.length; i++) {
    let code = (crc >>> 8) & 0xff;
    code ^= data[i] & 0xff;
    code ^= code >>> 4;
    crc = (crc << 8) & 0xffff;
    crc ^= code;
    code = (code << 5) & 0xffff;
    crc ^= code;
    code = (code << 7) & 0xffff;
    crc ^= code;
  }
  return crc;
}

function publicKeyToAddress(publicKey: Uint8Array): string {
  // Version byte (0x30 for account) + public key
  const versionedKey = new Uint8Array(1 + publicKey.length);
  versionedKey[0] = STELLAR_VERSION_ACCOUNT;
  versionedKey.set(publicKey, 1);

  // Calculate CRC16-XModem checksum
  const checksum = crc16xmodem(versionedKey);
  const checksumBytes = new Uint8Array(2);
  checksumBytes[0] = checksum & 0xff;
  checksumBytes[1] = (checksum >> 8) & 0xff;

  // Combine: version + publicKey + checksum
  const payload = new Uint8Array(versionedKey.length + 2);
  payload.set(versionedKey, 0);
  payload.set(checksumBytes, versionedKey.length);

  return base32.encode(payload);
}

/**
 * 抽离的核心逻辑：从 seed 生成 Stellar 地址
 * 可以被 SLIP39 直接调用，避免助记词转换
 */
export function generateStellarAddressFromSeed(seed: Buffer, path: string): string {
  const keyPair = deriveKeyPairWithPath(seed, path, 'ed25519');
  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    throw new Error('privateKey or publicKey is undefined');
  }

  // ed25519 public key with 0x00 prefix, need to remove it
  const publicKey = publicKeyArray.slice(1);
  return publicKeyToAddress(publicKey);
}

export default function stellarGetAddress(
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
    const address = generateStellarAddressFromSeed(seed, path);
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
