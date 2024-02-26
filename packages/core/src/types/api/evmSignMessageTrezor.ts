import { EthereumMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type EVMSignMessageParams = {
  path: string | number[];
  messageHex: string;
  chainId?: number;
};

export declare function evmSignMessageTrezor(
  connectId: string,
  deviceId: string,
  params: CommonParams & EVMSignMessageParams
): Response<EthereumMessageSignature>;
