import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { initConnector, initCore } from '../src/core';
import { DataManager } from '../src/data-manager';
import TransportManager from '../src/data-manager/TransportManager';
import { IFRAME, createErrorMessage } from '../src/events';
import SearchDevices from '../src/api/SearchDevices';
import { DeviceList } from '../src/device/DeviceList';
import { Device } from '../src/device/Device';
import { DevicePool } from '../src/device/DevicePool';

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

  test('entry-point errors preserve USB recovery context across JSON serialization', () => {
    const params = {
      operation: 'open',
      nativeErrorName: 'SecurityError',
      nativeErrorMessage: 'Access denied',
    };
    const error = ERRORS.TypedError(
      HardwareErrorCode.BridgeNeedsPermission,
      'Access denied',
      params
    );
    expect(JSON.parse(JSON.stringify(createErrorMessage(error)))).toEqual({
      success: false,
      payload: { code: HardwareErrorCode.BridgeNeedsPermission, error: 'Access denied', params },
    });
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
          payload: {
            method: 'getDeviceState',
            connectId: 'serial-V2',
            retryCount: 1,
            pollIntervalTime: 1,
            timeout: 1000,
          },
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
        expect(initialize).toHaveBeenCalledTimes(shouldCancel ? 0 : 2);
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
    HardwareErrorCode.BlePoweredOff,
    HardwareErrorCode.BleUnsupported,
    HardwareErrorCode.BridgeNeedsPermission,
    HardwareErrorCode.WebUsbDeviceAccessError,
  ])(
    'preserves terminal transport error %s in the public response without polling again',
    async errorCode => {
      jest
        .spyOn(DataManager, 'getSettings')
        .mockReturnValue(
          [
            HardwareErrorCode.BridgeNeedsPermission,
            HardwareErrorCode.WebUsbDeviceAccessError,
          ].includes(errorCode)
            ? ('desktop-webusb' as never)
            : ('react-native' as never)
        );
      const error = ERRORS.TypedError(errorCode);
      const acquire = jest.fn().mockRejectedValue(error);
      jest.spyOn(TransportManager, 'getTransport').mockReturnValue({
        acquire,
        enumerate: jest.fn().mockResolvedValue([{ path: 'ble-pairing-test' }]),
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

describe('Portfolio firmware compatibility through Core', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each(
    (['pro2', 'neo'] as const).flatMap(deviceType =>
      (['silent', 'progress'] as const).map(uiMode => ({ deviceType, uiMode }))
    )
  )(
    'checks the current $deviceType firmware before a $uiMode upload',
    async ({ deviceType, uiMode }) => {
      DevicePool.resetState();
      jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
      const device = Device.fromDescriptor({
        id: 'portfolio-device',
        path: 'portfolio-device',
        commType: 'ble',
        protocolType: 'V2',
      } as never);
      jest.spyOn(Device, 'fromDescriptor').mockReturnValue(device);
      jest.spyOn(device, 'acquire').mockResolvedValue(undefined);
      jest.spyOn(device, 'initialize').mockResolvedValue(undefined);
      jest.spyOn(device, 'release').mockResolvedValue(undefined);
      jest.spyOn(device, 'ensureProtocolV2RuntimeContext').mockResolvedValue({
        version: 2,
        supported_messages: [60805, 61400],
      });
      const typedCall = jest.fn();
      device.commands = {
        typedCall,
        disposed: false,
        dispose: jest.fn(),
        checkDisposed: jest.fn(),
      } as never;
      const core = initCore();
      let id = 0;
      const upload = () =>
        core.handleMessage({
          id: ++id,
          type: IFRAME.CALL,
          payload: {
            method: 'uploadPortfolio',
            connectId: 'portfolio-device',
            connectProtocol: 'V2',
            packageBase64: 'AQID',
            uiMode,
          },
        } as never);

      try {
        // Reuse one device across version changes to cover a retry after upgrading.
        for (const firmwareVersion of ['1.0.1', '1.0.2', '1.0.3', '1.0.10']) {
          device.features = {
            protocol: 'V2',
            deviceType,
            firmwareType: 'universal',
            firmwareVersion,
            mode: 'normal',
            initialized: true,
            bootloaderMode: false,
            capabilities: [],
          } as never;
          typedCall.mockReset();
          typedCall
            .mockResolvedValueOnce({ message: { processed_byte: 3 } })
            .mockResolvedValueOnce({ message: { message: 'Portfolio updated' } });

          const response = await upload();
          if (firmwareVersion === '1.0.1' || firmwareVersion === '1.0.2') {
            expect(response).toMatchObject({
              success: false,
              payload: {
                code: HardwareErrorCode.CallMethodNeedUpgradeFirmware,
                params: { current: firmwareVersion, require: '1.0.3', method: 'uploadPortfolio' },
              },
            });
            expect(typedCall).not.toHaveBeenCalled();
          } else {
            expect(response).toMatchObject({ success: true, payload: { portfolioUpdated: true } });
            expect(typedCall).toHaveBeenCalledTimes(2);
            expect(typedCall).toHaveBeenLastCalledWith('PortfolioUpdate', 'Success', {});
          }
        }

        typedCall.mockReset();
        typedCall
          .mockResolvedValueOnce({ message: { processed_byte: 3 } })
          .mockRejectedValueOnce(
            ERRORS.TypedError(
              HardwareErrorCode.RuntimeError,
              'Failure_DataError,Invalid portfolio package'
            )
          );
        await expect(upload()).resolves.toMatchObject({
          success: false,
          payload: {
            code: HardwareErrorCode.RuntimeError,
            error: 'Failure_DataError,Invalid portfolio package',
          },
        });
      } finally {
        await core.dispose();
        DevicePool.resetState();
      }
    }
  );
});
