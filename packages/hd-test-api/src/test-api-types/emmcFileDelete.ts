import type { EmmcFileDelete, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function emmcFileDelete(
  connectId: string,
  params: CommonParams & EmmcFileDelete
): Response<Success>;
