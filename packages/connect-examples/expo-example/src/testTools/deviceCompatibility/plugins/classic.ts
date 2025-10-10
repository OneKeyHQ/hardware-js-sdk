import { EDeviceType } from '@onekeyfe/hd-shared';
import { DevicePlugin } from '../DeviceCompatibility';

export const classicPlugin: DevicePlugin = {
  deviceType: EDeviceType.Classic,
  ignoreMethod: ['benfenGetAddress', 'neoGetAddress'],
};
