import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { initConnector, initCore } from '../src/core';
import { DataManager } from '../src/data-manager';
import TransportManager from '../src/data-manager/TransportManager';
import { IFRAME } from '../src/events';
import SearchDevices from '../src/api/SearchDevices';
import { DeviceList } from '../src/device/DeviceList';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

jest.mock('../src/data-manager/TransportManager', () => ({
  __esModule: true,
  default: {
    load: jest.fn(),
    configure: jest.fn().mockResolvedValue(undefined),
    getTransport: jest.fn(() => undefined),
  },
}));

describe('Core 错误输出边界', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    ['webusb', false],
    ['desktop-webusb', false],
    ['desktop-webusb', true],
  ] as const)(
    '%s waits for discovery without masking initialization or cancellation (cancel=%s)',
    async (env, shouldCancel) => {
      jest.spyOn(DataManager, 'getSettings').mockReturnValue(env as never);
      const error = ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed, 'probe failed');
      let finishSearch!: () => void;
      let searchStarted!: () => void;
      const started = new Promise<void>(resolve => {
        searchStarted = resolve;
      });
      const search = jest.spyOn(SearchDevices.prototype, 'run').mockImplementation(async () => {
        searchStarted();
        await new Promise<void>(resolve => {
          finishSearch = resolve;
        });
        return [];
      });
      const initialize = jest
        .spyOn(DeviceList.prototype, 'getDeviceLists')
        .mockRejectedValue(error);
      const core = initCore();
      initConnector();
      try {
        const discovery = core.handleMessage({
          id: 10,
          type: IFRAME.CALL,
          payload: { method: 'searchDevices' },
        } as never);
        await started;
        const request = core.handleMessage({
          id: 11,
          type: IFRAME.CALL,
          payload: { method: 'getDeviceState', connectId: 'serial-V2', retryCount: 0 },
        } as never);
        await new Promise(resolve => {
          setTimeout(resolve, 0);
        });
        expect(initialize).not.toHaveBeenCalled();
        if (shouldCancel) {
          await core.handleMessage({
            type: IFRAME.CANCEL,
            payload: { connectId: 'serial-V2' },
          } as never);
        }
        finishSearch();
        await expect(discovery).resolves.toMatchObject({ success: true });
        const expectedError = shouldCancel
          ? ERRORS.TypedError(HardwareErrorCode.CallQueueActionCancelled)
          : error;
        await expect(request).resolves.toMatchObject({
          success: false,
          payload: { code: expectedError.errorCode, error: expectedError.message },
        });
        await new Promise(resolve => {
          setTimeout(resolve, 0);
        });
        expect(search).toHaveBeenCalledTimes(1);
        expect(initialize).toHaveBeenCalledTimes(shouldCancel ? 0 : 1);
      } finally {
        finishSearch?.();
        await core.dispose();
      }
    }
  );

  test.each([
    HardwareErrorCode.BleDeviceNotBonded,
    HardwareErrorCode.BleDeviceBondedCanceled,
    HardwareErrorCode.BleDeviceDisconnected,
    HardwareErrorCode.PollingTimeout,
  ])(
    'preserves terminal BLE error %s in the public response without polling again',
    async errorCode => {
      jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
      const error = ERRORS.TypedError(errorCode);
      const acquire = jest.fn().mockRejectedValue(error);
      jest.spyOn(TransportManager, 'getTransport').mockReturnValue({
        acquire,
        release: jest.fn().mockResolvedValue(true),
        stop: jest.fn().mockResolvedValue(undefined),
      } as never);
      const core = initCore();
      initConnector();

      try {
        const response = await core.handleMessage({
          id: 1,
          event: IFRAME.CALL,
          type: IFRAME.CALL,
          payload: {
            method: 'getDeviceState',
            connectId: 'ble-pairing-test',
            forceProtocolDetection: true,
            retryCount: 1,
            pollIntervalTime: 1,
            timeout: 1000,
          },
        } as never);

        expect(response).toMatchObject({
          success: false,
          payload: { code: errorCode, error: error.message },
        });
        expect(acquire).toHaveBeenCalledTimes(1);
      } finally {
        await core.dispose();
      }
    }
  );

  test('desktop BLE still polls after a transient disconnect instead of failing immediately', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('desktop-web-ble' as never);
    const error = ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected);
    const acquire = jest.fn().mockRejectedValue(error);
    jest.spyOn(TransportManager, 'getTransport').mockReturnValue({
      acquire,
      release: jest.fn().mockResolvedValue(true),
      stop: jest.fn().mockResolvedValue(undefined),
    } as never);
    const core = initCore();
    initConnector();

    try {
      const response = await core.handleMessage({
        id: 1,
        event: IFRAME.CALL,
        type: IFRAME.CALL,
        payload: {
          method: 'getDeviceState',
          connectId: 'desktop-ble-disconnect-test',
          forceProtocolDetection: true,
          retryCount: 1,
          pollIntervalTime: 1,
          timeout: 1000,
        },
      } as never);

      expect(response).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceNotFound },
      });
      expect(acquire.mock.calls.length).toBeGreaterThan(1);
    } finally {
      await core.dispose();
    }
  });

  test('连接失败只返回结构化错误，不直接写入 stdout', async () => {
    const stdout = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const core = initCore();

    const response = await core.handleMessage({
      id: 1,
      event: IFRAME.CALL,
      type: IFRAME.CALL,
      payload: {
        method: 'getDeviceState',
        connectId: 'missing-device',
        retryCount: 0,
        pollIntervalTime: 1,
        timeout: 10,
      },
    } as never);

    expect(response).toMatchObject({ success: false });
    expect(stdout).not.toHaveBeenCalled();
    await core.dispose();
  });
});
