import { Success, EmmcFileDelete } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function emmcFileDelete(
  connectId: string,
  params: CommonParams & EmmcFileDelete
): Response<Success>;
