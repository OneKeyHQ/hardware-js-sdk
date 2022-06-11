import { Success } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type DeviceFlagsParams = {
  flags?: number;
};

export declare function deviceFlags(params: CommonParams & DeviceFlagsParams): Response<Success>;