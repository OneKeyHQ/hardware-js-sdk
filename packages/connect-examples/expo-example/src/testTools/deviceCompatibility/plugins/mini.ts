import { EDeviceType } from '@onekeyfe/hd-shared';
import { DevicePlugin } from '../DeviceCompatibility';

// 🎯 Mini 设备配置 - 极简版
export const miniPlugin: DevicePlugin = {
  deviceType: EDeviceType.Mini,
  ignoreMethod: [],
};
