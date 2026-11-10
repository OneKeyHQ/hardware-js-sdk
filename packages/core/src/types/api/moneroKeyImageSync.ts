import type { CommonParams, Response } from '../params';

// One owned output, as wallet2 describes it to the device. Keys are 32-byte hex.
export type MoneroKeyImageTransfer = {
  // Output public key
  outKey: string;
  // Transaction public key R
  txPubKey: string;
  // Additional tx public keys: the one for this output, or the whole list
  additionalTxPubKeys?: string[];
  // Index of the output within its transaction
  internalOutputIndex: number;
  // Receiving subaddress index; omitted means 0 (primary address)
  subAddrMajor?: number;
  subAddrMinor?: number;
};

// ChaCha20-Poly1305 under encKey, hex.
export type MoneroEncryptedKeyImage = {
  // 12-byte nonce
  iv: string;
  // Ciphertext of key image || signature c || signature r, then the 16-byte tag
  blob: string;
};

export type MoneroKeyImageSyncResult = {
  // Key that decrypts every blob, hex
  encKey: string;
  // One entry per transfer, in request order
  keyImages: MoneroEncryptedKeyImage[];
};

export type MoneroKeyImageSyncParams = {
  // Account path, m/44'/128'/account'
  path: string | number[];
  // 0 mainnet, 1 testnet, 2 stagenet
  networkType?: number;
  transfers: MoneroKeyImageTransfer[];
};

export declare function moneroKeyImageSync(
  connectId: string,
  deviceId: string,
  params: CommonParams & MoneroKeyImageSyncParams
): Response<MoneroKeyImageSyncResult>;
