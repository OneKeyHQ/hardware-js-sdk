import { EthereumPublicKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type EVMPublicKey = {
  path: string;
  publicKey: string;
} & EthereumPublicKey;

export type EVMGetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
  chainId?: number;
};

export declare function evmGetPublicKeyTrezor(
  connectId: string,
  deviceId: string,
  params: CommonParams & EVMGetPublicKeyParams
): Response<EVMPublicKey>;

export declare function evmGetPublicKeyTrezor(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: EVMGetPublicKeyParams[] }
): Response<Array<EVMPublicKey>>;

export declare function evmGetPublicKeyTrezor(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: EVMGetPublicKeyParams[]; useBatch?: boolean }
): Response<Omit<EVMPublicKey, 'node' | 'xpub'>>;
