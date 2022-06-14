import { Success } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type StarcoinVerifyMessageParams = {
  publicKey: string;
  messageHex: string;
  signature: string;
};

export declare function starcoinVerifyMessage(
  connectId: string,
  params: CommonParams & StarcoinVerifyMessageParams
): Response<Success>;
