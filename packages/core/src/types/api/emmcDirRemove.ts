import { Success, EmmcDirRemove } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function emmcDirRemove(
  connectId: string,
  params: CommonParams & EmmcDirRemove
): Response<Success>;
