import type { EmmcDir, EmmcDirList } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function emmcDirList(
  connectId: string,
  params: CommonParams & EmmcDirList
): Response<EmmcDir>;
