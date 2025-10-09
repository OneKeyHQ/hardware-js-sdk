import { EDeviceType } from '@onekeyfe/hd-shared';
import { DevicePlugin } from '../DeviceCompatibility';

// 🎯 Touch 设备配置 - 极简版
export const touchPlugin: DevicePlugin = {
  deviceType: EDeviceType.Touch,
  ignoreMethod: [],
};
