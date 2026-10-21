import type { StarknetPublicKeyType } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type StarknetPublicKey = {
  path: string;
  // STARK: 32-byte x-only key; SECP256K1: 33-byte compressed key. 0x-prefixed hex.
  pub: string;
};

export type StarknetGetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
  // defaults to STARK
  publicKeyType?: StarknetPublicKeyType;
};

export declare function starknetGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & StarknetGetPublicKeyParams
): Response<StarknetPublicKey>;

export declare function starknetGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: StarknetGetPublicKeyParams[] }
): Response<Array<StarknetPublicKey>>;
