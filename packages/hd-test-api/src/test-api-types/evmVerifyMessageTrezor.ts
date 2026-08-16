import type { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export type EVMVerifyMessageParams = {
  address: string;
  messageHex: string;
  signature: string;
  chainId?: number;
};

export declare function evmVerifyMessageTrezor(
  connectId: string,
  deviceId: string,
  params: CommonParams & EVMVerifyMessageParams
): Response<Success>;
