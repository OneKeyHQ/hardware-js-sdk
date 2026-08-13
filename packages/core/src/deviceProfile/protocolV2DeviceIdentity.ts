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
    case DeviceType.NEO:
    case 'NEO':
      return { deviceType: EDeviceType.Neo, model: 'neo' };
    default:
      return { deviceType: EDeviceType.Unknown, model: null };
  }
};

export const resolveProtocolV2BleName = ({
  bleName,
  deviceType,
}: {
  bleName?: string | null;
  deviceType: EDeviceType;
}): string | null => {
  const normalizedBleName = bleName?.trim();
  if (!normalizedBleName) return null;
  // Early Pro2 firmware can expose its serial as the BLE advertising name.
  if (deviceType === EDeviceType.Pro2 && /^P2[A-Z0-9]{8,}$/iu.test(normalizedBleName)) {
    return `Pro2 ${normalizedBleName.slice(-4).toUpperCase()}`;
  }
  return normalizedBleName;
};
