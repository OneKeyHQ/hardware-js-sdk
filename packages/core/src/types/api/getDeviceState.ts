import type { DeviceState, DeviceStateSection } from '../device';
import type { CommonParams, Response } from '../params';

/** SDK 内部状态读取选项，不属于公共 CoreApi。 */
export type DeviceStateReadOptions = {
  refreshSections?: DeviceStateSection[];
  includeRaw?: boolean;
};

export declare function getDeviceState(
  connectId?: string,
  params?: CommonParams
): Response<DeviceState>;
