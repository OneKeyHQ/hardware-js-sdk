import * as hdShared from '@onekeyfe/hd-shared';

import FirmwareUpdateV3 from '../../src/api/FirmwareUpdateV3';
import { DataManager } from '../../src/data-manager';
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

  it('uses the BLE reconnect budget for a prepared BLE artifact', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    jest.spyOn(hdShared, 'wait').mockResolvedValue(undefined);
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
        connectId: 'ble-device',
      },
    });
    const reconnectError = new Error('stop after reconnect budget assertion');
    const waitForDeviceReconnect = jest
      .spyOn(method, 'waitForDeviceReconnect')
      .mockRejectedValue(reconnectError);
    method.isBleReconnect = jest.fn(() => true);
    method.params = {
      platform: 'native',
      artifacts: {
        ble: {
          artifactRef: `fw:${'a'.repeat(64)}`,
          size: 4,
          sha256: 'a'.repeat(64),
        },
      },
    } as any;
    const commands = {
      typedCall: jest.fn().mockRejectedValue(new Error('device rebooting')),
    };
    method.device = {
      features: {},
      getCommands: () => commands,
    } as unknown as Device;
    (method as any).createUpdatesFolderIfNotExists = jest.fn().mockResolvedValue(undefined);
    (method as any).startEmmcFirmwareUpdate = jest.fn().mockResolvedValue(undefined);
    method.postTipMessage = jest.fn();
    method.postProcessingMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    try {
      await expect(
        (method as any).executeUpdate({
          resourceBinary: null,
          resourceEntries: [],
          fwSources: [],
          bootloaderSource: null,
        })
      ).rejects.toBe(reconnectError);

      expect(commands.typedCall).toHaveBeenCalledWith('GetFeatures', 'Features', {});
      expect(waitForDeviceReconnect).toHaveBeenCalledWith(3 * 60 * 1000);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('lets Browser WebUSB clean up a timed out install probe before reconnecting', async () => {
    jest.spyOn(hdShared, 'wait').mockResolvedValue(undefined);
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('webusb' as never);
    jest.spyOn(DataManager, 'isBrowserWebUsb').mockReturnValue(true);
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
        connectId: 'webusb-device',
      },
    });
    const reconnectError = new Error('stop after WebUSB reconnect assertion');
    const waitForDeviceReconnect = jest
      .spyOn(method, 'waitForDeviceReconnect')
      .mockRejectedValue(reconnectError);
    method.isBleReconnect = jest.fn(() => false);
    method.params = {
      platform: 'web',
    } as any;
    const commands = {
      typedCall: jest.fn().mockRejectedValue(new Error('Protocol V1 read timeout after 3000ms')),
    };
    method.device = {
      features: {},
      getCommands: () => commands,
    } as unknown as Device;
    (method as any).createUpdatesFolderIfNotExists = jest.fn().mockResolvedValue(undefined);
    (method as any).startEmmcFirmwareUpdate = jest.fn().mockResolvedValue(undefined);
    method.postTipMessage = jest.fn();
    method.postProcessingMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    await expect(
      (method as any).executeUpdate({
        resourceBinary: null,
        resourceEntries: [],
        fwSources: [],
        bootloaderSource: null,
      })
    ).rejects.toBe(reconnectError);

    expect(commands.typedCall).toHaveBeenCalledWith(
      'GetFeatures',
      'Features',
      {},
      {
        timeoutMs: 3000,
      }
    );
    expect(waitForDeviceReconnect).toHaveBeenCalledWith(60 * 1000);
  });
});
