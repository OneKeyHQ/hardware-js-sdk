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

  test('writes the USB Request before polling current install status', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-usb',
      },
    });
    const targets = [{ target_id: 4, path: 'vol0:/application_p1.bin' }];
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'Success', message: {} })
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
        message: { records: [] },
      })
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
        message: {
          records: [
            {
              target_id: 4,
              status: 'FW_MGMT_UPDATER_TASK_STATUS_PENDING',
              path: 'vol0:/application_p1.bin',
            },
          ],
        },
      })
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
    const call = jest.fn().mockResolvedValue({
      type: 'WriteCompleted',
      message: {},
    });
    const setCancelableAction = jest.fn();

    method.device = {
      getCommands: () => ({ typedCall, call, cancelDevice: jest.fn() }),
      createProtocolV2UiPhaseMetadata: jest.fn().mockReturnValue(undefined),
      toMessageObject: jest.fn().mockReturnValue({ connectId: 'pro2-usb' }),
      setCancelableAction,
      clearCancelableAction: jest.fn(),
    } as unknown as Device;
    method.postMessage = jest.fn();
    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    const firmwareUpdate = method as unknown as {
      protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<void>;
      waitForProtocolV2FirmwareUpdateComplete: (
        value: typeof targets,
        requireCurrentInstallStatus: boolean
      ) => Promise<void>;
      reconnectProtocolV2Device: () => Promise<void>;
      verifyProtocolV2ReconnectIdentity: () => Promise<Record<string, never>>;
    };
    firmwareUpdate.reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    firmwareUpdate.verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue({});
    (method as any).isBleReconnect = jest.fn(() => false);

    await firmwareUpdate.protocolV2StartFirmwareUpdate({ targets });

    expect(typedCall.mock.calls[0]).toEqual(['DeviceFirmwareUpdateStage', 'Success', { targets }]);
    expect(call).toHaveBeenCalledWith(
      'DeviceFirmwareUpdateRequest',
      {},
      expect.objectContaining({
        returnAfterWrite: true,
        expectedTypes: ['Success'],
        onResponseAfterWrite: expect.any(Function),
      })
    );
    expect(method.postProgressMessage).not.toHaveBeenCalled();

    await firmwareUpdate.waitForProtocolV2FirmwareUpdateComplete(targets, true);

    expect(typedCall.mock.calls[1]?.[0]).toBe('DeviceFirmwareUpdateStatusGet');
    expect(method.postProgressMessage).toHaveBeenCalledWith(1, 'installingFirmware');
    expect(method.postProgressMessage).toHaveBeenCalledWith(100, 'installingFirmware');
    expect(call.mock.invocationCallOrder[0]).toBeLessThan(typedCall.mock.invocationCallOrder[1]);
    expect(setCancelableAction).toHaveBeenCalledTimes(2);
  });

  test('accepts finished USB status after the Request terminal Success arrives', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-usb',
      },
    });
    const targets = [{ target_id: 4, path: 'vol0:/application_p1.bin' }];
    const typedCall = jest
      .fn()
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
    const call = jest.fn().mockResolvedValue({
      type: 'WriteCompleted',
      message: {},
    });

    method.device = {
      getCommands: () => ({ typedCall, call, cancelDevice: jest.fn() }),
      createProtocolV2UiPhaseMetadata: jest.fn().mockReturnValue(undefined),
      toMessageObject: jest.fn().mockReturnValue({ connectId: 'pro2-usb' }),
      setCancelableAction: jest.fn(),
      clearCancelableAction: jest.fn(),
    } as unknown as Device;
    method.postMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    const firmwareUpdate = method as unknown as {
      protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<void>;
      waitForProtocolV2FirmwareUpdateComplete: (
        value: typeof targets,
        requireCurrentInstallStatus: boolean
      ) => Promise<void>;
    };

    await firmwareUpdate.protocolV2StartFirmwareUpdate({ targets });
    const requestOptions = call.mock.calls[0]?.[2] as {
      onResponseAfterWrite: (response: { type: 'Success'; message: Record<string, never> }) => void;
    };
    requestOptions.onResponseAfterWrite({ type: 'Success', message: {} });
    await firmwareUpdate.waitForProtocolV2FirmwareUpdateComplete(targets, true);

    expect(method.postProgressMessage).toHaveBeenCalledWith(100, 'installingFirmware');
  });

  test('reconnects USB when the link is released while writing the Request', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-usb',
      },
    });
    const targets = [{ target_id: 4, path: 'vol0:/application_p1.bin' }];
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'Success', message: {} })
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
        message: {
          records: [
            {
              target_id: 4,
              status: 'FW_MGMT_UPDATER_TASK_STATUS_IN_PROGRESS',
              path: 'vol0:/application_p1.bin',
            },
          ],
        },
      })
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
    const call = jest.fn().mockRejectedValue(new Error('device was disconnected'));

    method.device = {
      getCommands: () => ({ typedCall, call, cancelDevice: jest.fn() }),
      createProtocolV2UiPhaseMetadata: jest.fn().mockReturnValue(undefined),
      toMessageObject: jest.fn().mockReturnValue({ connectId: 'pro2-usb' }),
      setCancelableAction: jest.fn(),
      clearCancelableAction: jest.fn(),
    } as unknown as Device;
    method.postMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    const firmwareUpdate = method as unknown as {
      protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<void>;
      waitForProtocolV2FirmwareUpdateComplete: (
        value: typeof targets,
        requireCurrentInstallStatus: boolean
      ) => Promise<void>;
      reconnectProtocolV2Device: (options: { skipProtocolProbe: boolean }) => Promise<void>;
      verifyProtocolV2ReconnectIdentity: () => Promise<Record<string, never>>;
    };
    firmwareUpdate.reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    firmwareUpdate.verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue({});
    (method as any).isBleReconnect = jest.fn(() => false);

    await firmwareUpdate.protocolV2StartFirmwareUpdate({ targets });
    await firmwareUpdate.waitForProtocolV2FirmwareUpdateComplete(targets, true);

    expect(firmwareUpdate.reconnectProtocolV2Device).toHaveBeenCalledWith({
      skipProtocolProbe: true,
    });
    expect(firmwareUpdate.verifyProtocolV2ReconnectIdentity).toHaveBeenCalledTimes(1);
    expect(method.postProgressMessage).toHaveBeenCalledWith(1, 'installingFirmware');
    expect(method.postProgressMessage).toHaveBeenCalledWith(100, 'installingFirmware');
  });

  test('writes the BLE Request and completes only from target status polling', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        connectId: 'pro2-ble',
      },
    });
    const targets = [{ target_id: 6, path: 'vol0:/coprocessor.bin' }];
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'Success', message: {} })
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
        message: {
          records: [
            {
              target_id: 6,
              status: 'FW_MGMT_UPDATER_TASK_STATUS_IN_PROGRESS',
              path: 'vol0:/coprocessor.bin',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
        message: {
          records: [
            {
              target_id: 6,
              status: 'FW_MGMT_UPDATER_TASK_STATUS_FINISHED',
              path: 'vol0:/coprocessor.bin',
            },
          ],
        },
      });
    const call = jest.fn().mockResolvedValue({
      type: 'WriteCompleted',
      message: {},
    });

    method.device = {
      getCommands: () => ({ typedCall, call }),
      createProtocolV2UiPhaseMetadata: jest.fn().mockReturnValue(undefined),
      toMessageObject: jest.fn().mockReturnValue({ connectId: 'pro2-ble' }),
      setCancelableAction: jest.fn(),
      clearCancelableAction: jest.fn(),
    } as unknown as Device;
    method.postMessage = jest.fn();
    method.postProgressMessage = jest.fn();
    (method as any).isBleReconnect = jest.fn(() => true);

    const firmwareUpdate = method as unknown as {
      protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<void>;
      waitForProtocolV2FirmwareUpdateComplete: (
        value: typeof targets,
        requireCurrentInstallStatus: boolean
      ) => Promise<void>;
    };

    await firmwareUpdate.protocolV2StartFirmwareUpdate({ targets });

    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenCalledWith('DeviceFirmwareUpdateStage', 'Success', { targets });
    expect(call).toHaveBeenCalledWith(
      'DeviceFirmwareUpdateRequest',
      {},
      expect.objectContaining({
        returnAfterWrite: true,
        expectedTypes: ['Success'],
        onResponseAfterWrite: expect.any(Function),
      })
    );
    expect(method.postProgressMessage).not.toHaveBeenCalled();

    await firmwareUpdate.waitForProtocolV2FirmwareUpdateComplete(targets, true);

    expect(typedCall.mock.calls[1]?.[0]).toBe('DeviceFirmwareUpdateStatusGet');
    expect(typedCall.mock.calls[1]?.[1]).toBe('DeviceFirmwareUpdateStatus');
    expect(method.postProgressMessage).toHaveBeenCalledWith(100, 'installingFirmware');
  });

  test('confirms App mode when BLE status becomes empty after current install progress', async () => {
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
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
        message: {
          records: [
            {
              target_id: 4,
              status: 'FW_MGMT_UPDATER_TASK_STATUS_IN_PROGRESS',
              path: 'vol0:/application_p1.bin',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
        message: { records: [] },
      });
    const reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    const deviceInfo = {};
    const verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue(deviceInfo);
    const probeProtocolV2NormalMode = jest.fn().mockResolvedValue(true);

    method.device = {
      getCommands: () => ({ typedCall }),
    } as unknown as Device;
    method.postProgressMessage = jest.fn();

    const firmwareUpdate = method as unknown as {
      protocolV2InstallNeedsReconnect: boolean;
      waitForProtocolV2FirmwareUpdateComplete: (
        value: typeof targets,
        requireCurrentInstallStatus: boolean
      ) => Promise<void>;
      reconnectProtocolV2Device: (options: { skipProtocolProbe: boolean }) => Promise<void>;
      verifyProtocolV2ReconnectIdentity: () => Promise<typeof deviceInfo>;
      probeProtocolV2NormalMode: (value: typeof deviceInfo) => Promise<boolean>;
    };
    firmwareUpdate.protocolV2InstallNeedsReconnect = true;
    firmwareUpdate.reconnectProtocolV2Device = reconnectProtocolV2Device;
    firmwareUpdate.verifyProtocolV2ReconnectIdentity = verifyProtocolV2ReconnectIdentity;
    firmwareUpdate.probeProtocolV2NormalMode = probeProtocolV2NormalMode;
    (method as any).isBleReconnect = jest.fn(() => true);

    await firmwareUpdate.waitForProtocolV2FirmwareUpdateComplete(targets, true);

    expect(reconnectProtocolV2Device).toHaveBeenCalledWith({ skipProtocolProbe: true });
    expect(verifyProtocolV2ReconnectIdentity).toHaveBeenCalledTimes(1);
    expect(probeProtocolV2NormalMode).toHaveBeenCalledWith(deviceInfo);
    expect(method.postProgressMessage).toHaveBeenCalledWith(100, 'installingFirmware');
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
      if (type === 'DeviceFirmwareUpdateStatusGet') {
        return Promise.reject(actionCancelledError);
      }
      return Promise.resolve({ type: 'Success', message: {} });
    });
    const call = jest.fn().mockResolvedValue({
      type: 'WriteCompleted',
      message: {},
    });

    method.device = {
      getCommands: () => ({ typedCall, call, cancelDevice: jest.fn() }),
      createProtocolV2UiPhaseMetadata: jest.fn().mockReturnValue(undefined),
      toMessageObject: jest.fn().mockReturnValue({ connectId: 'pro2-usb' }),
      setCancelableAction: jest.fn(),
      clearCancelableAction: jest.fn(),
    } as unknown as Device;
    method.postMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    const firmwareUpdate = method as unknown as {
      protocolV2StartFirmwareUpdate: (params: { targets: typeof targets }) => Promise<void>;
      waitForProtocolV2FirmwareUpdateComplete: (
        value: typeof targets,
        requireCurrentInstallStatus: boolean
      ) => Promise<void>;
    };

    await firmwareUpdate.protocolV2StartFirmwareUpdate({ targets });
    await expect(
      firmwareUpdate.waitForProtocolV2FirmwareUpdateComplete(targets, true)
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.ActionCancelled,
    });

    expect(call).toHaveBeenCalledWith(
      'DeviceFirmwareUpdateRequest',
      {},
      expect.objectContaining({ returnAfterWrite: true })
    );
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
