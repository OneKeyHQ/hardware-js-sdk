import { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type EVMVerifyMessageParams = {
  address: string;
  messageHex: string;
  signature: string;
};

export declare function evmVerifyMessage(
  connectId: string,
  params: CommonParams & EVMVerifyMessageParams
): Response<Success>;
