import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import FirmwareUpdateV4 from '../../src/api/FirmwareUpdateV4';
import { DataManager } from '../../src/data-manager';

import type { Device } from '../../src/device/Device';

jest.mock('../../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('FirmwareUpdateV4 install polling', () => {
  let getSettingsSpy: jest.SpyInstance;

  beforeEach(() => {
    getSettingsSpy = jest
      .spyOn(DataManager, 'getSettings')
      .mockReturnValue('react-native' as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('polls status instead of replaying install after React Native BLE releases', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-ble',
      },
    });
    const targets = [{ target_id: 4, path: 'vol0:/application_p1.bin' }];
    const typedCall = jest
      .fn()
      .mockRejectedValueOnce(new Error('React Native BLE transport released'))
      .mockResolvedValueOnce({
        message: {
          records: [
            {
              target_id: 4,
              status: 'FW_MGMT_UPDATER_TASK_STATUS_FINISHED',
              path: 'vol0:/application_p1.bin',
            },
          ],
        },
      });

    method.device = {
      getCommands: () => ({ typedCall }),
    } as unknown as Device;
    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    const firmwareUpdate = method as unknown as {
      protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<unknown>;
      waitForProtocolV2FirmwareUpdateComplete: (value: typeof targets) => Promise<void>;
      reconnectProtocolV2Device: () => Promise<void>;
      verifyProtocolV2ReconnectIdentity: () => Promise<Record<string, never>>;
    };
    firmwareUpdate.reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    firmwareUpdate.verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue({});

    await expect(
      firmwareUpdate.protocolV2StartFirmwareUpdate({ targets })
    ).resolves.toBeUndefined();
    await expect(
      firmwareUpdate.waitForProtocolV2FirmwareUpdateComplete(targets)
    ).resolves.toBeUndefined();

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall.mock.calls[0]?.[0]).toBe('DeviceFirmwareUpdateRequest');
    expect(typedCall.mock.calls[1]?.[0]).toBe('DeviceFirmwareUpdateStatusGet');
  });

  test('does not treat an explicit workflow cancellation as an install reboot', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-ble',
      },
    });
    const targets = [{ target_id: 4, path: 'vol0:/application_p1.bin' }];
    const typedCall = jest.fn().mockRejectedValue(new Error('React Native BLE transport released'));
    const abortController = new AbortController();
    abortController.abort();

    method.abortSignal = abortController.signal;
    method.device = {
      getCommands: () => ({ typedCall }),
    } as unknown as Device;

    await expect(
      (
        method as unknown as {
          protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<unknown>;
        }
      ).protocolV2StartFirmwareUpdate({ targets })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallQueueActionCancelled,
    });

    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test.each([
    HardwareErrorCode.BleConnectedError,
    HardwareErrorCode.BleCharacteristicNotifyError,
    HardwareErrorCode.BleForceCleanRunPromise,
    HardwareErrorCode.BleDeviceDisconnected,
  ])('continues install polling after BLE interruption error %s', async errorCode => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-ble',
      },
    });
    const targets = [{ target_id: 4, path: 'vol0:/application_p1.bin' }];
    const typedCall = jest.fn().mockRejectedValue(ERRORS.TypedError(errorCode));

    method.device = {
      getCommands: () => ({ typedCall }),
    } as unknown as Device;
    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    await expect(
      (
        method as unknown as {
          protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<unknown>;
        }
      ).protocolV2StartFirmwareUpdate({ targets })
    ).resolves.toBeUndefined();

    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['webusb', 'React Native BLE transport released'],
    ['react-native', 'Unrelated transport failure'],
  ])(
    'requires both a BLE environment and an explicit transport release signal: %s / %s',
    async (env, message) => {
      getSettingsSpy.mockReturnValue(env);
      const method = new FirmwareUpdateV4({
        id: 1,
        payload: {
          method: 'firmwareUpdateV4',
          connectId: 'pro2-device',
        },
      });
      const targets = [{ target_id: 4, path: 'vol0:/application_p1.bin' }];
      const typedCall = jest.fn().mockRejectedValue(new Error(message));

      method.device = {
        getCommands: () => ({ typedCall }),
      } as unknown as Device;
      method.postTipMessage = jest.fn();
      method.postProgressMessage = jest.fn();

      await expect(
        (
          method as unknown as {
            protocolV2StartFirmwareUpdate: (params: {
              targets: typeof targets;
            }) => Promise<unknown>;
          }
        ).protocolV2StartFirmwareUpdate({ targets })
      ).rejects.toThrow(message);

      expect(method.postTipMessage).not.toHaveBeenCalled();
      expect(method.postProgressMessage).not.toHaveBeenCalled();
    }
  );
});
