import { EthereumMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type EVMSignMessageEIP712Params = {
  path: string | number[];
  domainHash: string;
  messageHash: string;
};

export declare function evmSignMessageEIP712(
  connectId: string,
  deviceId: string,
  params: CommonParams & EVMSignMessageEIP712Params
): Response<EthereumMessageSignature>;
