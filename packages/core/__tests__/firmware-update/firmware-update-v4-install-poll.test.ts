import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import FirmwareUpdateV4 from '../../src/api/FirmwareUpdateV4';

import type { Device } from '../../src/device/Device';

jest.mock('../../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('FirmwareUpdateV4 install polling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('uses Stage, waits for the empty Request response, then polls status', async () => {
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
      .mockResolvedValueOnce({ type: 'Success', message: {} })
      .mockResolvedValueOnce({ type: 'Success', message: {} })
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
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
      createProtocolV2UiPhaseMetadata: jest.fn().mockReturnValue(undefined),
      toMessageObject: jest.fn().mockReturnValue({ connectId: 'pro2-ble' }),
      setCancelableAction: jest.fn(),
      clearCancelableAction: jest.fn(),
    } as unknown as Device;
    method.postMessage = jest.fn();
    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    const firmwareUpdate = method as unknown as {
      protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<void>;
      waitForProtocolV2FirmwareUpdateComplete: (value: typeof targets) => Promise<void>;
      reconnectProtocolV2Device: () => Promise<void>;
      verifyProtocolV2ReconnectIdentity: () => Promise<Record<string, never>>;
    };
    firmwareUpdate.reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    firmwareUpdate.verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue({});

    await firmwareUpdate.protocolV2StartFirmwareUpdate({ targets });
    await firmwareUpdate.waitForProtocolV2FirmwareUpdateComplete(targets);

    expect(typedCall.mock.calls[0]).toEqual(['DeviceFirmwareUpdateStage', 'Success', { targets }]);
    expect(typedCall.mock.calls[1]).toEqual(['DeviceFirmwareUpdateRequest', 'Success', {}]);
    expect(method.postProgressMessage).toHaveBeenCalledWith(1, 'installingFirmware');
    expect(typedCall.mock.calls[2]?.[0]).toBe('DeviceFirmwareUpdateStatusGet');
    expect(typedCall.mock.invocationCallOrder[1]).toBeLessThan(
      typedCall.mock.invocationCallOrder[2]
    );
  });

  test('does not send Request when Stage is rejected', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-ble',
      },
    });
    const targets = [{ target_id: 4, path: 'vol0:/application_p1.bin' }];
    const typedCall = jest.fn().mockRejectedValue(new Error('stage rejected'));

    method.device = {
      getCommands: () => ({ typedCall }),
    } as unknown as Device;

    await expect(
      (
        method as unknown as {
          protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<void>;
        }
      ).protocolV2StartFirmwareUpdate({ targets })
    ).rejects.toThrow('stage rejected');

    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('does not enter install state when the device cancels the Request', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-usb',
      },
    });
    const targets = [{ target_id: 4, path: 'vol0:/application_p1.bin' }];
    const actionCancelledError = ERRORS.TypedError(HardwareErrorCode.ActionCancelled);
    const typedCall = jest.fn().mockImplementation((type: string) => {
      if (type === 'DeviceFirmwareUpdateRequest') {
        return Promise.reject(actionCancelledError);
      }
      if (type === 'DeviceFirmwareUpdateStatusGet') {
        return Promise.resolve({ type: 'Success', message: {} });
      }
      return Promise.resolve({ type: 'Success', message: {} });
    });
    const call = jest.fn().mockResolvedValue({
      type: 'Failure',
      message: { code: 'Failure_ActionCancelled' },
    });

    method.device = {
      getCommands: () => ({ typedCall, call }),
      createProtocolV2UiPhaseMetadata: jest.fn().mockReturnValue(undefined),
      toMessageObject: jest.fn().mockReturnValue({ connectId: 'pro2-usb' }),
      setCancelableAction: jest.fn(),
    } as unknown as Device;
    method.postMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    await expect(
      (
        method as unknown as {
          protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<void>;
        }
      ).protocolV2StartFirmwareUpdate({ targets })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.ActionCancelled,
    });

    expect(typedCall).toHaveBeenCalledWith('DeviceFirmwareUpdateRequest', 'Success', {});
    expect(call).not.toHaveBeenCalled();
    expect(method.postProgressMessage).not.toHaveBeenCalled();
  });

  test('does not hide an explicit workflow cancellation during status polling', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-ble',
      },
    });
    const abortController = new AbortController();
    abortController.abort();

    method.abortSignal = abortController.signal;

    await expect(
      (
        method as unknown as {
          waitForProtocolV2FirmwareUpdateComplete: (
            targets: Array<{ target_id: number; path: string }>
          ) => Promise<void>;
        }
      ).waitForProtocolV2FirmwareUpdateComplete([
        { target_id: 4, path: 'vol0:/application_p1.bin' },
      ])
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallQueueActionCancelled,
    });
  });

  test('stops polling when the device cancels firmware installation', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-ble',
      },
    });
    const typedCall = jest
      .fn()
      .mockRejectedValue(ERRORS.TypedError(HardwareErrorCode.ActionCancelled));
    const reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);

    method.device = {
      getCommands: () => ({ typedCall }),
    } as unknown as Device;
    const firmwareUpdate = method as unknown as {
      waitForProtocolV2FirmwareUpdateComplete: (
        targets: Array<{ target_id: number; path: string }>
      ) => Promise<void>;
      reconnectProtocolV2Device: () => Promise<void>;
    };
    firmwareUpdate.reconnectProtocolV2Device = reconnectProtocolV2Device;

    await expect(
      firmwareUpdate.waitForProtocolV2FirmwareUpdateComplete([
        { target_id: 4, path: 'vol0:/application_p1.bin' },
      ])
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.ActionCancelled,
    });

    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(reconnectProtocolV2Device).not.toHaveBeenCalled();
  });
});
