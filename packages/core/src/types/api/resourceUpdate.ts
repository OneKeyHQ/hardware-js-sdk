import { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function resourceUpdate(
  connectId: string,
  deviceId: string,
  params: CommonParams & {
    name: string;
    data: string;
  }
): Response<Success>;
