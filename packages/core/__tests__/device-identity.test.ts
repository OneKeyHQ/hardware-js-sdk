import { checkLiveDeviceId } from '../src/device/deviceIdentity';

describe('live device identity', () => {
  test('refreshes Protocol V2 status before comparing the expected device id', async () => {
    let currentDeviceId = 'OLD_DEVICE_ID';
    const device = {
      isProtocolV2: () => true,
      getDeviceState: jest.fn().mockImplementation(async () => {
        currentDeviceId = 'NEW_DEVICE_ID';
        return { identity: { deviceId: currentDeviceId } };
      }),
      checkDeviceId: jest.fn((expected: string) => currentDeviceId === expected),
    };

    await expect(checkLiveDeviceId(device as never, 'OLD_DEVICE_ID')).resolves.toBe(false);
    expect(device.getDeviceState).toHaveBeenCalledWith({ refreshSections: ['status'] });
    expect(device.checkDeviceId).toHaveBeenCalledWith('OLD_DEVICE_ID');
  });

  test('keeps Protocol V1 identity checks on the Initialize/GetFeatures state', async () => {
    const device = {
      isProtocolV2: () => false,
      getDeviceState: jest.fn(),
      checkDeviceId: jest.fn(() => true),
    };

    await expect(checkLiveDeviceId(device as never, 'V1_DEVICE_ID')).resolves.toBe(true);
    expect(device.getDeviceState).not.toHaveBeenCalled();
  });
});
