import FirmwareUpdateV3 from '../../src/api/FirmwareUpdateV3';
import { DevicePool } from '../../src/device/DevicePool';

import type { Device } from '../../src/device/Device';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('FirmwareUpdateV3 reconnect', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps transient USB acquire failures inside the reconnect loop', async () => {
    const acquire = jest.fn().mockResolvedValue(undefined);
    const commands = {
      disposed: true,
      mainId: '',
    };
    const cachedDevice = {} as Device;
    const updateFromCache = jest.fn();
    jest.spyOn(DevicePool, 'getDevices').mockResolvedValue({
      devices: {},
      deviceList: [cachedDevice],
    });

    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
        connectId: 'usb-path',
      },
    });
    method.isBleReconnect = jest.fn(() => false);
    method.device = {
      originalDescriptor: {
        id: 'usb-path',
        path: 'usb-path',
        protocolType: 'V1',
      },
      deviceConnector: {
        enumerate: jest.fn().mockResolvedValue({
          descriptors: [{ path: 'usb-path' }],
        }),
      },
      updateFromCache,
      acquire,
      commands,
      getCommands: () => commands,
      mainId: 'usb-session',
    } as unknown as Device;

    await method.waitForDeviceReconnect(1000);

    expect(updateFromCache).toHaveBeenCalledWith(cachedDevice);
    expect(acquire).toHaveBeenCalledWith(undefined, {
      throwOnRunPromiseError: true,
    });
    expect(commands.disposed).toBe(false);
    expect(commands.mainId).toBe('usb-session');
  });
});
