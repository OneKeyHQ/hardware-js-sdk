import { StarcoinPublicKey as HardwareStarcoinPublicKey } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type StarcoinPublicKey = {
  path: string;
} & HardwareStarcoinPublicKey;

export type StarcoinGetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function starcoinGetPublicKey(
  connectId: string,
  params: CommonParams & StarcoinGetPublicKeyParams
): Response<StarcoinPublicKey>;

export declare function starcoinGetPublicKey(
  connectId: string,
  params: CommonParams & { bundle?: StarcoinGetPublicKeyParams[] }
): Response<Array<StarcoinPublicKey>>;
