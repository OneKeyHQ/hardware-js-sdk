import { EthereumAddress } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type EVMGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function evmGetAddress(
  params: CommonParams & EVMGetAddressParams
): Response<EthereumAddress>;

export declare function evmGetAddress(
  params: CommonParams & { bundle?: EVMGetAddressParams[] }
): Response<Array<EthereumAddress>>;
