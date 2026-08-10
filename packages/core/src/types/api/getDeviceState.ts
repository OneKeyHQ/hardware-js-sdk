import type { DeviceState, DeviceStateSection } from '../device';
import type { CommonParams, Response } from '../params';

export type DeviceStateScope = 'runtime' | 'settings' | 'firmware';

export type GetDeviceStateParams = CommonParams & {
  scope?: DeviceStateScope;
};

/** Internal state-read options, not part of the public CoreApi. */
export type DeviceStateReadOptions = {
  refreshSections?: DeviceStateSection[];
  includeRaw?: boolean;
  /** Internal recovery-only compatibility used by discovery and firmware update flows. */
  allowLegacyProtocolV2ProtocolInfo?: boolean;
};

export declare function getDeviceState(
  connectId?: string,
  params?: GetDeviceStateParams
): Response<DeviceState>;
