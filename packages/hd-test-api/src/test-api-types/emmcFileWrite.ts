import type { EmmcFileWrite, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function emmcFileWrite(
  connectId: string,
  params: CommonParams & EmmcFileWrite
): Response<Success>;
