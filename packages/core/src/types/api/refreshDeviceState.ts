import type { DeviceState } from '../device';
import type { CommonParams, Response } from '../params';

export type DeviceStateRefreshScope = 'basic' | 'firmware' | 'settings' | 'runtime';

export type RefreshDeviceStateParams = CommonParams & {
  scope: DeviceStateRefreshScope;
};

export declare function refreshDeviceState(
  connectId: string,
  params: RefreshDeviceStateParams
): Response<DeviceState>;
