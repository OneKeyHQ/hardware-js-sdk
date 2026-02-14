import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

export const touchPlugin: DevicePlugin = {
  deviceType: EDeviceType.Touch,
  overrides: [],
};
