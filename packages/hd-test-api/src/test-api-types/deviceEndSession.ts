import type { EndSession, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function deviceEndSession(
  connectId: string,
  params: CommonParams & EndSession
): Response<Success>;
