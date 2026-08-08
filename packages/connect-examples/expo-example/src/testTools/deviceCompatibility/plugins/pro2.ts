import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

/** Pro2 method availability is derived from the Core Protocol V2 contract. */
export const pro2Plugin: DevicePlugin = {
  deviceType: EDeviceType.Pro2,
};
