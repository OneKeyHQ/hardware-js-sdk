import { Success, EndSession } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceEndSession(
  connectId: string,
  params: CommonParams & EndSession
): Response<Success>;
