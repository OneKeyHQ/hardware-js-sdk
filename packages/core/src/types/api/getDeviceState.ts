import type { DeviceState, DeviceStateSection } from '../device';
import type { CommonParams, Response } from '../params';

export type DeviceStateScope = 'runtime' | 'settings' | 'firmware';

export type GetDeviceStateParams = CommonParams & {
  scope?: DeviceStateScope;
};

/** SDK 内部状态读取选项，不属于公共 CoreApi。 */
export type DeviceStateReadOptions = {
  refreshSections?: DeviceStateSection[];
  includeRaw?: boolean;
};

export declare function getDeviceState(
  connectId?: string,
  params?: GetDeviceStateParams
): Response<DeviceState>;
