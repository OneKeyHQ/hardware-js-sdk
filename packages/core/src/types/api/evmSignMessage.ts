import { EthereumMessageSignature } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type EVMSignMessageParams = {
  path: string | number[];
  messageHex: string;
};

export declare function evmSignMessage(
  params: CommonParams & EVMSignMessageParams
): Response<EthereumMessageSignature>;
