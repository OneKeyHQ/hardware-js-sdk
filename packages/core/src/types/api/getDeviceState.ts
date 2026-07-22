import type { DeviceState, DeviceStateSection } from '../device';
import type { CommonParams, Response } from '../params';

export type GetDeviceStateParams = {
  refresh?: DeviceStateSection[];
  includeRaw?: boolean;
};

export declare function getDeviceState(
  connectId?: string,
  params?: CommonParams & GetDeviceStateParams
): Response<DeviceState>;
