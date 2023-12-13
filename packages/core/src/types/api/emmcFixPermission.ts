import { Success, EmmcFixPermission } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function emmcFixPermission(
  connectId: string,
  params: CommonParams & EmmcFixPermission
): Response<Success>;
