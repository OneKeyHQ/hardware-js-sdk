import type { Device } from './Device';

type DeviceIdentityReader = Pick<Device, 'isProtocolV2' | 'getDeviceState' | 'checkDeviceId'>;

/**
 * Protocol V2 的 deviceId 来自运行态状态，比较前必须读取一次实时 status。
 * Protocol V1 继续复用 Initialize/GetFeatures 已经返回的设备身份。
 */
export async function checkLiveDeviceId(
  device: DeviceIdentityReader,
  expectedDeviceId: string
): Promise<boolean> {
  if (device.isProtocolV2()) {
    await device.getDeviceState({ refreshSections: ['status'] });
  }

  return device.checkDeviceId(expectedDeviceId);
}
