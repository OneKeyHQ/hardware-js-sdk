import type { EmmcDirMake, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function emmcDirMake(
  connectId: string,
  params: CommonParams & EmmcDirMake
): Response<Success>;
