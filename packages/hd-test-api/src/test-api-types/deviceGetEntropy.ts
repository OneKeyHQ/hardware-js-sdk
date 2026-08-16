import type { GetEntropy, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function deviceGetEntropy(
  connectId: string,
  params: CommonParams & GetEntropy
): Response<Success>;
