import { EDeviceType } from '@onekeyfe/hd-shared';
import { DeviceType } from '@onekeyfe/hd-transport';

export const resolveProtocolV2DeviceIdentity = (
  deviceType?: DeviceType | keyof typeof DeviceType | null
): { deviceType: EDeviceType; model: string | null } => {
  switch (deviceType) {
    case DeviceType.CLASSIC1:
    case 'CLASSIC1':
      return { deviceType: EDeviceType.Classic, model: 'classic' };
    case DeviceType.CLASSIC1S:
    case 'CLASSIC1S':
      return { deviceType: EDeviceType.Classic1s, model: 'classic1s' };
    case DeviceType.CLASSIC1S_PURE:
    case 'CLASSIC1S_PURE':
      return { deviceType: EDeviceType.ClassicPure, model: 'classicpure' };
    case DeviceType.MINI:
    case 'MINI':
      return { deviceType: EDeviceType.Mini, model: 'mini' };
    case DeviceType.TOUCH:
    case 'TOUCH':
      return { deviceType: EDeviceType.Touch, model: 'touch' };
    case DeviceType.PRO:
    case 'PRO':
      return { deviceType: EDeviceType.Pro, model: 'pro' };
    case DeviceType.PRO2:
    case 'PRO2':
      return { deviceType: EDeviceType.Pro2, model: 'pro2' };
    default:
      return { deviceType: EDeviceType.Unknown, model: null };
  }
};
