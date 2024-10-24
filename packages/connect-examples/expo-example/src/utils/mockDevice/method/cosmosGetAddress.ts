import { ripemd160 } from '@noble/hashes/ripemd160';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { CosmosGetAddressParams, Success, Unsuccessful } from '@onekeyfe/hd-core';
import { bech32 } from '@scure/base';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

export type ICurveName = 'secp256k1' | 'nistp256' | 'ed25519';

const secp256k1PubkeyToRawAddress = (pubkey: Uint8Array): Uint8Array => {
  if (pubkey.length !== 33) {
    throw new Error(`Invalid Secp256k1 pubkey length (compressed): ${pubkey.length}`);
  }

  return ripemd160(sha256(pubkey));
};

const ed25519PubkeyToRawAddress = (pubkey: Uint8Array): Uint8Array => {
  if (pubkey.length !== 32) {
    throw new Error(`Invalid Ed25519 pubkey length: ${pubkey.length}`);
  }

  return sha256(pubkey).slice(0, 20);
};

export const pubkeyToBaseAddress = (curve: ICurveName, pubkey: Uint8Array): string => {
  const digest =
    curve === 'secp256k1' ? secp256k1PubkeyToRawAddress(pubkey) : ed25519PubkeyToRawAddress(pubkey);
  return bytesToHex(digest);
};

export const pubkeyToAddress = (curve: ICurveName, prefix: string, pubkey: Uint8Array): string => {
  const digest = pubkeyToBaseAddress(curve, pubkey);
  return bech32.encode(prefix, bech32.toWords(hexToBytes(digest)));
};

export const baseAddressToAddress = (prefix: string, baseAddress: string): string =>
  bech32.encode(prefix, bech32.toWords(hexToBytes(baseAddress)));

export function pubkeyToAddressDetail({
  curve,
  publicKey,
  addressPrefix,
}: {
  curve: ICurveName;
  publicKey: string;
  addressPrefix: string | undefined;
}) {
  const pubKeyBuffer = hexToBytes(publicKey);
  const baseAddress = pubkeyToBaseAddress(curve, pubKeyBuffer);
  const address = baseAddressToAddress(addressPrefix || '', baseAddress);
  return {
    baseAddress,
    address,
  };
}

export default function cosmosGetAddress(
  connectId: string,
  deviceId: string,
  params: CosmosGetAddressParams & {
    mnemonic: string;
    passphrase?: string;
  }
):
  | Unsuccessful
  | Success<{
      address: string;
      path: string;
    }> {
  const { path, mnemonic, passphrase, hrp } = params;

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

  const { address } = pubkeyToAddressDetail({
    curve: 'secp256k1',
    publicKey: bytesToHex(publicKeyArray),
    addressPrefix: hrp,
  });

  return {
    success: true,
    payload: {
      address,
      // @ts-expect-error
      path,
    },
  };
}
