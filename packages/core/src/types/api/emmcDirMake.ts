import { Success, EmmcDirMake } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function emmcDirMake(
  connectId: string,
  params: CommonParams & EmmcDirMake
): Response<Success>;
