import type { EmmcFile, EmmcPathInfo } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function emmcPathInfo(
  connectId: string,
  params: CommonParams & EmmcPathInfo
): Response<EmmcFile>;
