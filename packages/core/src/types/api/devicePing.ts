import { Ping, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function devicePing(
  connectId: string,
  params: CommonParams & Ping
): Response<Success>;
