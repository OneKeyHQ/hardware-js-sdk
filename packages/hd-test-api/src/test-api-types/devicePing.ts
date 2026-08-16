import type { Ping, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function devicePing(
  connectId: string,
  params: CommonParams & Ping
): Response<Success>;
