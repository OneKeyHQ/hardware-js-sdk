import { EmmcFile, EmmcPathInfo } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function emmcPathInfo(
  connectId: string,
  params: CommonParams & EmmcPathInfo
): Response<EmmcFile>;
