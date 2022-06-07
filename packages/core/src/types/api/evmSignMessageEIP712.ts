import { EthereumMessageSignature } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type EVMSignMessageEIP712Params = {
  path: string | number[];
  domainHash: string;
  messageHash: string;
};

export declare function evmSignMessageEIP712(
  params: CommonParams & EVMSignMessageEIP712Params
): Response<EthereumMessageSignature>;
