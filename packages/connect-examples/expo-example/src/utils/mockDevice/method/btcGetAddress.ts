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

  const network = bitcoin.networks.bitcoin;
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
