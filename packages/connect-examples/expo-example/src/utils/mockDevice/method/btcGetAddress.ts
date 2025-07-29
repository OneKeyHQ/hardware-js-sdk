import * as bitcoin from 'bitcoinjs-lib';
import { initEccLib } from 'bitcoinjs-lib';
import * as bchaddr from 'bchaddrjs';
import { getPublicKey, Point, utils } from '@noble/secp256k1';
import type { Success, Unsuccessful } from '@onekeyfe/hd-core';

import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

// Minimal ECC wrapper for bitcoinjs-lib using @noble/secp256k1
const ecc = {
  isPoint: (p: Uint8Array) => {
    try {
      Point.fromHex(p);
      return true;
    } catch {
      return false;
    }
  },
  isPrivate: (d: Uint8Array) => utils.isValidPrivateKey(d),
  isXOnlyPoint: (p: Uint8Array) => p.length === 32 && ecc.isPoint(p),
  pointFromScalar: (sk: Uint8Array, compressed?: boolean) => {
    try {
      return getPublicKey(sk, compressed !== false);
    } catch {
      return null;
    }
  },
  xOnlyPointAddTweak: (p: Uint8Array, tweak: Uint8Array) => {
    try {
      const P = Point.fromHex(p);
      const t = BigInt(`0x${Buffer.from(tweak).toString('hex')}`);
      const Q = Point.BASE.multiplyAndAddUnsafe(P, t, 1n);
      if (!Q) return null;
      const pubkey = Q.toRawBytes(true);
      const parity = pubkey[0] % 2 === 1 ? 1 : 0;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return { parity: parity as 0 | 1, xOnlyPubkey: pubkey.slice(1) };
    } catch {
      return null;
    }
  },
  pointAddScalar: (p: Uint8Array, tweak: Uint8Array, compressed?: boolean) => {
    try {
      const P = Point.fromHex(p);
      const t = BigInt(`0x${Buffer.from(tweak).toString('hex')}`);
      const Q = Point.BASE.multiplyAndAddUnsafe(P, t, 1n);
      if (!Q) return null;
      return Q.toRawBytes(compressed !== false);
    } catch {
      return null;
    }
  },
};

// Initialize ECC library once
let eccInitialized = false;
function ensureEccInitialized() {
  if (!eccInitialized) {
    initEccLib(ecc);
    eccInitialized = true;
  }
}

// Simple Taproot address generation
function generateTaprootAddress(publicKey: Buffer, network: bitcoin.Network): string {
  ensureEccInitialized();

  // For P2TR, we need x-only public key (32 bytes)
  const xOnlyPubkey = publicKey.length === 33 ? publicKey.subarray(1) : publicKey;

  // Create Taproot address
  const { address } = bitcoin.payments.p2tr({
    internalPubkey: xOnlyPubkey,
    network,
  });

  if (!address) {
    throw new Error('Failed to generate Taproot address');
  }

  return address;
}
/**
 * p2pkh、p2sh-p2wpkh、p2wpkh、taproot
 */
function getAddressTypeByPath(path: string) {
  const pathArr = path.split('/');
  const purpose = pathArr[1];

  if (purpose === "44'") {
    return 'p2pkh';
  }
  if (purpose === "49'") {
    return 'p2sh-p2wpkh';
  }
  if (purpose === "84'") {
    return 'p2wpkh';
  }
  if (purpose === "86'") {
    return 'p2tr';
  }
}

const NetworkMap = {
  btc: bitcoin.networks.bitcoin,
  testnet: bitcoin.networks.testnet,
  bch: {
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: '',
    bip32: {
      public: 0x04_88_b2_1e,
      private: 0x04_88_ad_e4,
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80,
  },
  doge: {
    messagePrefix: '\x19Dogecoin Signed Message:\n',
    bech32: '',
    bip32: {
      public: 0x02_fa_ca_fd,
      private: 0x02_fa_c3_98,
    },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e,
    maximumFeeRate: 1_000_000, // doge
  },
  ltc: {
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    // TODO getVersionBytesByAddressEncoding
    // EAddressEncodings.P2PKH read .bip32, others read .segwitVersionBytes
    bip32: {
      public: 0x01_9d_a4_62,
      private: 0x01_9d_9c_fe,
    },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0,
  },
  neurai: {
    messagePrefix: '\x19Neuraium Signed Message:\n',
    bech32: '',
    bip32: {
      public: 0x04_88_ad_e4,
      private: 0x04_88_b2_1e,
    },
    pubKeyHash: 0x35,
    scriptHash: 0x75,
    wif: 0x80,
  },
  dash: {
    messagePrefix: '\x19DarkCoin Signed Message:\n',
    bech32: '',
    bip32: {
      public: 0x02_fe_52_cc,
      private: 0x02_fe_52_f8,
    },
    pubKeyHash: 0x4c,
    scriptHash: 0x10,
    wif: 0xcc,
  },
};

function getBtcAddress(type: string, publicKey: Buffer, network: bitcoin.networks.Network) {
  let data;
  // p2pkh
  if (type === 'p2pkh') {
    data = bitcoin.payments.p2pkh({
      pubkey: publicKey,
      network,
    });
  }
  // p2sh-p2wpkh
  else if (type === 'p2sh-p2wpkh') {
    data = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({
        pubkey: publicKey,
        network,
      }),
    });
  }
  // p2wpkh
  else if (type === 'p2wpkh') {
    data = bitcoin.payments.p2wpkh({
      pubkey: publicKey,
      network,
    });
  }
  // taproot - use our simplified function
  else if (type === 'p2tr') {
    return generateTaprootAddress(publicKey, network);
  }
  if (typeof data === 'undefined') {
    return '';
  }

  return data.address ?? '';
}

/**
 * 抽离的核心逻辑：从 seed 生成 BTC 地址
 * 可以被 SLIP39 直接调用，避免助记词转换
 */
export function generateBtcAddressFromSeed(
  seed: Buffer,
  path: string,
  coin = 'btc'
): Promise<string> {
  const network = NetworkMap[coin as keyof typeof NetworkMap];
  if (!network) {
    throw new Error(`Unsupported coin: ${coin}`);
  }

  const keyPair = deriveKeyPairWithPath(seed, path);
  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!publicKeyArray) {
    throw new Error('Invalid public key');
  }

  const publicKey = Buffer.from(publicKeyArray);
  const addressType = getAddressTypeByPath(path);

  if (!addressType) {
    throw new Error('Invalid path');
  }

  const address = getBtcAddress(addressType, publicKey, network);

  // Convert BCH addresses to bitcoincash: format
  if (coin === 'bch') {
    try {
      // Convert legacy address to bitcoincash: format
      return Promise.resolve(bchaddr.toCashAddress(address));
    } catch (error) {
      throw new Error(
        `BCH address conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return Promise.resolve(address);
}

export default async function btcGetAddress(
  connectId: string,
  deviceId: string,
  params: any & {
    mnemonic: string;
    passphrase?: string;
  }
): Promise<
  | Unsuccessful
  | Success<{
      address: string;
      path: string;
    }>
> {
  const { path, coin, mnemonic, passphrase } = params;
  const seed = mnemonicToSeed(mnemonic, passphrase);

  try {
    const address = await generateBtcAddressFromSeed(seed, path, coin);
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
