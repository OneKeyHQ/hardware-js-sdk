import { Success } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type EVMVerifyMessageParams = {
  address: string;
  messageHex: string;
  signature: string;
};

export declare function evmVerifyMessage(
  params: CommonParams & EVMVerifyMessageParams
): Response<Success>;
