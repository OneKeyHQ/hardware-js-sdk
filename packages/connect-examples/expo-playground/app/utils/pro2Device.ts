import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DeviceInfo } from '../types/hardware';

export function isPro2DeviceInfo(device?: DeviceInfo | null): device is DeviceInfo {
  if (!device) return false;
  const model = (device.features?.model ?? '').toLowerCase();
  return (
    device.deviceType === EDeviceType.Pro2 ||
    device.features?.deviceType === EDeviceType.Pro2 ||
    model === 'pro2'
  );
}
