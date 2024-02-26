import { EmmcDir, EmmcDirList } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function emmcDirList(
  connectId: string,
  params: CommonParams & EmmcDirList
): Response<EmmcDir>;
