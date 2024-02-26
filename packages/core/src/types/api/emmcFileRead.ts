import { EmmcFile, EmmcFileRead } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function emmcFileRead(
  connectId: string,
  params: CommonParams & EmmcFileRead
): Response<EmmcFile>;
