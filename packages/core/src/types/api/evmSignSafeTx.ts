import { EthereumMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';
import { EthereumSignTypedDataMessage, EthereumSignTypedDataTypes } from './evmSignTypedData';

export type EVMSignTypedDataParams = {
  path: string | number[];
  data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
  chainId?: number;
};

export declare function evmSignSafeTx(
  connectId: string,
  deviceId: string,
  params: CommonParams & EVMSignTypedDataParams
): Response<EthereumMessageSignature>;
