import * as bitcoin from 'bitcoinjs-lib';

import type { Success, Unsuccessful } from '@onekeyfe/hd-core';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

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
  // taproot
  else if (type === 'p2tr') {
    data = bitcoin.payments.p2tr({
      internalPubkey: publicKey.slice(1, 33),
    });
  }
  if (typeof data === 'undefined') {
    return '';
  }

  return data.address ?? '';
}

export default function btcGetAddress(
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
  const { path, coin, mnemonic, passphrase } = params;

  const network = NetworkMap[coin as keyof typeof NetworkMap];
  const seed = mnemonicToSeed(mnemonic, passphrase);

  const keyPair = deriveKeyPairWithPath(seed, path);
  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;
  if (!publicKeyArray) {
    return {
      success: false,
      payload: {
        code: 801,
        error: 'Invalid public key',
      },
    };
  }
  const publicKey = Buffer.from(publicKeyArray);

  const addressType = getAddressTypeByPath(path);

  if (!addressType) {
    return {
      success: false,
      payload: {
        code: 802,
        error: 'Invalid path',
      },
    };
  }

  return {
    success: true,
    payload: {
      address: getBtcAddress(addressType, publicKey, network),
      path,
    },
  };
}
