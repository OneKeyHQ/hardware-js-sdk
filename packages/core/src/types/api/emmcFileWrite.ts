import { Success, EmmcFileWrite } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function emmcFileWrite(
  connectId: string,
  params: CommonParams & EmmcFileWrite
): Response<Success>;
