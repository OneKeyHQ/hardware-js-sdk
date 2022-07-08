import { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DeviceFlagsParams = {
  flags?: number;
};

export declare function deviceFlags(
  connectId: string,
  params: CommonParams & DeviceFlagsParams
): Response<Success>;
