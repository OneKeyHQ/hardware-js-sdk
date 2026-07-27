import type { Device } from './Device';

type DeviceIdentityReader = Pick<Device, 'isProtocolV2' | 'getDeviceState' | 'checkDeviceId'>;

/**
 * Protocol V2 deviceId comes from runtime state and requires a live status read.
 * Protocol V1 reuses the identity returned by Initialize/GetFeatures.
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
