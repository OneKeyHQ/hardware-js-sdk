import { EDeviceType } from '@onekeyfe/hd-shared';
import { DevicePlugin } from '../DeviceCompatibility';

// 🎯 Pro 设备配置 - 极简版
export const proPlugin: DevicePlugin = {
  deviceType: EDeviceType.Pro,
  ignoreMethod: [],
};
