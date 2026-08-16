import type { EmmcFile, EmmcFileRead } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function emmcFileRead(
  connectId: string,
  params: CommonParams & EmmcFileRead
): Response<EmmcFile>;
