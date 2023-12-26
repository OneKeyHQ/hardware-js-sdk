import type { CosiSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type CosiSignParam = {
  path: string;
  data?: string;
  global_commitment?: string;
  global_pubkey?: string;
};

export declare function cryptoCosiSign(
  connectId: string,
  deviceId: string,
  params: CommonParams & CosiSignParam
): Response<CosiSignature>;
