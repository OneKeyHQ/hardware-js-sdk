import type { EmmcDirRemove, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function emmcDirRemove(
  connectId: string,
  params: CommonParams & EmmcDirRemove
): Response<Success>;
