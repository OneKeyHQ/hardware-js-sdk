import { GetEntropy, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceGetEntropy(
  connectId: string,
  params: CommonParams & GetEntropy
): Response<Success>;
