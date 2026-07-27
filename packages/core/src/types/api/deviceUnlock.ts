import type { DeviceState } from '../device';
import type { CommonParams, Response } from '../params';

export declare function deviceUnlock(
  connectId: string,
  params?: CommonParams
): Response<DeviceState>;
