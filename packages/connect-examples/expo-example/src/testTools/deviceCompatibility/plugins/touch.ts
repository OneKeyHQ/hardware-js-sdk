import { EDeviceType } from '@onekeyfe/hd-shared';
import { DevicePlugin } from '../DeviceCompatibility';

export const touchPlugin: DevicePlugin = {
  deviceType: EDeviceType.Touch,
  ignoreMethod: [],
};
