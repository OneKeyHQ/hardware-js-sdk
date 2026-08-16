import type { SEPublicKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function readSEPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams
): Response<SEPublicKey>;
