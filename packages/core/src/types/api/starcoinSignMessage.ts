import { StarcoinMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type StarcoinSignMessageParams = {
  path: string | number[];
  messageHex: string;
};

export declare function starcoinSignMessage(
  connectId: string,
  params: CommonParams & StarcoinSignMessageParams
): Response<StarcoinMessageSignature>;
