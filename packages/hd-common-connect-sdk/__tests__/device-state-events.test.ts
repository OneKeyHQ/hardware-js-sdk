import { readFileSync } from 'fs';
import { resolve } from 'path';
import EventEmitter from 'events';
import {
  CORE_EVENT,
  UI_REQUEST,
  initCore,
  probeUsbDeviceIdentitiesWithTransport,
} from '@onekeyfe/hd-core';
import { HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';
import HttpTransport from '@onekeyfe/hd-transport-http';

import sdkExport, { messagePromises, probeUsbDeviceIdentities } from '../src';

jest.mock('../../core/src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));
jest.mock('@onekeyfe/hd-core', () => ({
  ...jest.requireActual('@onekeyfe/hd-core'),
  __esModule: true,
  default: (options: unknown) => options,
  initCore: jest.fn(),
  probeUsbDeviceIdentitiesWithTransport: jest.fn(),
}));
jest.mock('@onekeyfe/hd-transport-http', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@onekeyfe/hd-transport-web-device', () => ({ WebUsbTransport: jest.fn() }));
jest.mock('@onekeyfe/hd-transport-lowlevel', () => ({}));
jest.mock('@onekeyfe/hd-transport-emulator', () => ({}));

describe('hd-common-connect-sdk device state events', () => {
  test('forwards the canonical DEVICE.STATE event to SDK consumers', () => {
    const source = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf8');

    expect(source).toContain('DEVICE.STATE');
    expect(source).toContain('eventEmitter.emit(message.type, message.payload)');
  });
});

const sdk = sdkExport as unknown as {
  init(settings: Record<string, unknown>): Promise<boolean>;
  call(params: Record<string, unknown>): Promise<unknown>;
  dispose(): Promise<void>;
};

describe('SDK request cleanup', () => {
  const core = Object.assign(new EventEmitter(), {
    handleMessage: jest.fn(),
    dispose: jest.fn(),
  });

  beforeEach(async () => {
    core.handleMessage.mockReset();
    core.dispose.mockReset().mockImplementation(() => {
      core.removeAllListeners();
      return Promise.resolve();
    });
    jest.mocked(initCore).mockResolvedValue(core as never);
    await sdk.init({ env: 'desktop-web-ble' });
  });

  afterEach(async () => {
    await sdk.dispose();
  });

  test.each([
    [HardwareErrorCode.BlePoweredOff, UI_REQUEST.BLUETOOTH_POWERED_OFF],
    [HardwareErrorCode.BleUnsupported, UI_REQUEST.BLUETOOTH_UNSUPPORTED],
    [HardwareErrorCode.BleLocationError, UI_REQUEST.LOCATION_PERMISSION],
  ])('emits the adapter UI request for error %s', async (code, type) => {
    const response = { success: false, payload: { code, error: 'Adapter unavailable' } };
    core.handleMessage.mockResolvedValueOnce(response);
    await expect(sdk.call({ method: 'searchDevices' })).resolves.toEqual(response);
    expect(core.handleMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({ type }));
  });

  test('removes only the completed request when calls settle out of order', async () => {
    const first = createDeferred<unknown>();
    const second = createDeferred<unknown>();
    core.handleMessage.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const firstCall = sdk.call({ method: 'getDeviceState' });
    const secondCall = sdk.call({ method: 'getDeviceState' });
    expect(Object.keys(messagePromises)).toHaveLength(2);
    second.resolve({ success: true, payload: {} });
    await secondCall;
    expect(Object.keys(messagePromises)).toHaveLength(1);
    first.reject(new Error('Connection failed'));
    await firstCall;
    expect(Object.keys(messagePromises)).toHaveLength(0);
  });

  test.each(['webusb'] as const)(
    'probes %s without disposing an outstanding BLE request and coalesces concurrent probes',
    async commType => {
      const pending = createDeferred<unknown>();
      const discovery = createDeferred<never[]>();
      core.handleMessage.mockReturnValueOnce(pending.promise);
      const request = sdk.call({ method: 'getDeviceState' });
      jest
        .mocked(probeUsbDeviceIdentitiesWithTransport)
        .mockReset()
        .mockReturnValueOnce(discovery.promise);
      const initializationCount = jest.mocked(initCore).mock.calls.length;
      const first = probeUsbDeviceIdentities({ commType });
      const second = probeUsbDeviceIdentities({ commType });
      expect(second).toBe(first);
      expect(probeUsbDeviceIdentitiesWithTransport).toHaveBeenCalledTimes(1);
      discovery.resolve([]);
      await first;
      expect(core.dispose).not.toHaveBeenCalled();
      expect(initCore).toHaveBeenCalledTimes(initializationCount);
      expect(core.listenerCount(CORE_EVENT)).toBe(1);
      expect(Object.keys(messagePromises)).toHaveLength(1);
      pending.resolve({ success: true, payload: {} });
      await expect(request).resolves.toMatchObject({ success: true });
      expect(Object.keys(messagePromises)).toHaveLength(0);
    }
  );

  test('rejects the withdrawn Bridge probe without creating a transport or affecting BLE', async () => {
    jest.mocked(HttpTransport).mockClear();
    jest.mocked(probeUsbDeviceIdentitiesWithTransport).mockClear();
    await expect(probeUsbDeviceIdentities({ commType: 'bridge' })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
    expect(HttpTransport).not.toHaveBeenCalled();
    expect(probeUsbDeviceIdentitiesWithTransport).not.toHaveBeenCalled();
    expect(core.dispose).not.toHaveBeenCalled();
  });

  test('waits for Core disposal and does not retain old listeners after reinitialization', async () => {
    const cleanup = createDeferred<void>();
    core.dispose.mockImplementationOnce(async () => {
      await cleanup.promise;
      core.removeAllListeners();
    });
    let finished = false;
    const disposing = sdk.dispose().then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(core.dispose).toHaveBeenCalledTimes(1);
    expect(finished).toBe(false);
    cleanup.resolve();
    await disposing;
    await sdk.init({ env: 'desktop-web-ble' });
    expect(core.listenerCount(CORE_EVENT)).toBe(1);
  });
});
