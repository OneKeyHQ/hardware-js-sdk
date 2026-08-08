import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

/** Neo shares the Protocol V2 method contract but keeps an independent plugin slot. */
export const neoPlugin: DevicePlugin = {
  deviceType: EDeviceType.Neo,
};
