import { StarcoinMessageSignature } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type StarcoinSignMessageParams = {
  path: string | number[];
  messageHex: string;
};

export declare function starcoinSignMessage(
  connectId: string,
  params: CommonParams & StarcoinSignMessageParams
): Response<StarcoinMessageSignature>;
