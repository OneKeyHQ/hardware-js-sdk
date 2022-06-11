import { EthereumPublicKey } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type EVMGetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function evmGetPublicKey(
  connectId: string,
  params: CommonParams & EVMGetPublicKeyParams
): Response<EthereumPublicKey>;

export declare function evmGetPublicKey(
  connectId: string,
  params: CommonParams & { bundle?: EVMGetPublicKeyParams[] }
): Response<Array<EthereumPublicKey>>;
