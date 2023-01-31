import { EthereumPublicKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type EVMPublicKey = {
  path: string;
} & EthereumPublicKey;

export type EVMGetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
  chainId?: number;
};

export declare function evmGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & EVMGetPublicKeyParams
): Response<EVMPublicKey>;

export declare function evmGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: EVMGetPublicKeyParams[] }
): Response<Array<EVMPublicKey>>;
