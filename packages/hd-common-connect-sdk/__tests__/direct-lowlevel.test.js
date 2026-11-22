import EventEmitter from 'events';
import {
  CORE_EVENT,
  DEVICE,
  DEVICE_EVENT,
  UI_EVENT,
  UI_REQUEST,
  IFRAME,
  UI_RESPONSE,
  initCore,
  switchTransport,
} from '@onekeyfe/hd-core';
import { HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';

import { HardwareSDKLowLevel } from '../src';

jest.mock('../../core/src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));
jest.mock('@onekeyfe/hd-core', () => ({
  __esModule: true,
  ...jest.requireActual('@onekeyfe/hd-core'),
  initCore: jest.fn(),
  switchTransport: jest.fn(),
}));
jest.mock('@onekeyfe/hd-transport-http', () => ({}));
jest.mock('@onekeyfe/hd-transport-web-device', () => ({ WebUsbTransport: {} }));
jest.mock('@onekeyfe/hd-transport-lowlevel', () => ({}));
jest.mock('@onekeyfe/hd-transport-emulator', () => ({}));

const core = Object.assign(new EventEmitter(), {
  handleMessage: jest.fn(),
  dispose: jest.fn(() => {
    core.removeAllListeners();
    return Promise.resolve();
  }),
});

beforeEach(() => {
  jest.clearAllMocks();
  initCore.mockResolvedValue(core);
});
afterEach(async () => HardwareSDKLowLevel.dispose());

test('initializes, calls and switches the local Core without a DOM or iframe', async () => {
  expect(typeof document).toBe('undefined');
  expect(await HardwareSDKLowLevel.init({ env: 'webusb' })).toBe(true);
  expect(initCore).toHaveBeenCalledWith(
    expect.objectContaining({ env: 'webusb' }),
    expect.anything(),
    undefined,
    expect.any(AbortSignal)
  );
  const response = { success: true, payload: { test: true } };
  core.handleMessage.mockResolvedValue(response);
  expect(await HardwareSDKLowLevel.call({ method: 'getFeatures' })).toBe(response);
  expect(core.handleMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      event: IFRAME.CALL,
      type: IFRAME.CALL,
      payload: expect.objectContaining({ method: 'getFeatures' }),
    })
  );
  expect(await HardwareSDKLowLevel.switchTransport('webusb')).toStrictEqual({
    success: true,
    payload: {},
  });
  expect(switchTransport).toHaveBeenCalledWith({
    env: 'webusb',
    owner: core,
    loadTransport: expect.any(Function),
    plugin: undefined,
  });
});

test('keeps the Web LowLevel event envelope and cleans listeners on dispose', async () => {
  const listener = jest.fn();
  HardwareSDKLowLevel.addHardwareGlobalEventListener(listener);
  await HardwareSDKLowLevel.init({ env: 'webusb' });
  const payload = { device: { label: 'Synthetic device' } };
  core.emit(CORE_EVENT, { event: DEVICE_EVENT, type: DEVICE.CONNECT, payload });
  expect(listener).toHaveBeenLastCalledWith({
    ...payload,
    event: DEVICE.CONNECT,
    type: DEVICE.CONNECT,
  });
  const message = { event: UI_EVENT, type: UI_REQUEST.REQUEST_BUTTON, payload: {} };
  core.emit(CORE_EVENT, message);
  expect(listener).toHaveBeenLastCalledWith(message);
  await HardwareSDKLowLevel.dispose();
  await HardwareSDKLowLevel.init({ env: 'webusb' });
  listener.mockClear();
  core.emit(CORE_EVENT, message);
  expect(listener).not.toHaveBeenCalled();
  expect(core.listenerCount(CORE_EVENT)).toBe(1);
});

test('uses settings staged before initialization', async () => {
  await HardwareSDKLowLevel.updateSettings({ env: 'webusb' });
  await HardwareSDKLowLevel.init({ debug: false });
  expect(initCore).toHaveBeenCalledWith(
    expect.objectContaining({ env: 'webusb' }),
    expect.anything(),
    undefined,
    expect.any(AbortSignal)
  );
});

test('reports settings errors through the Promise contract', async () => {
  await HardwareSDKLowLevel.init({ env: 'webusb' });
  const result = HardwareSDKLowLevel.updateSettings({});
  await expect(result).rejects.toMatchObject({
    errorCode: HardwareErrorCode.IFrameAleradyInitialized,
  });
});

test('rejects settings updates as soon as initialization is queued', async () => {
  const initializing = HardwareSDKLowLevel.init({ env: 'webusb', fetchConfig: true });

  await expect(
    HardwareSDKLowLevel.updateSettings({ firmwareManifestMode: 'external-only' })
  ).rejects.toMatchObject({ errorCode: HardwareErrorCode.IFrameAleradyInitialized });

  await expect(initializing).resolves.toBe(true);
});

test.each([
  UI_REQUEST.FIRMWARE_PROGRESS,
  UI_REQUEST.FIRMWARE_TIP,
  UI_REQUEST.PREVIOUS_ADDRESS_RESULT,
])('forwards %s once with the original UI envelope', async type => {
  const listener = jest.fn();
  HardwareSDKLowLevel.addHardwareGlobalEventListener(listener);
  await HardwareSDKLowLevel.init({ env: 'webusb' });
  const message = { event: UI_EVENT, type, payload: { progress: 1 } };
  core.emit(CORE_EVENT, message);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith(message);
});

test('waits for an in-flight initialization to release its Core on dispose', async () => {
  const entered = createDeferred();
  const initializingCore = createDeferred();
  const cleanupStarted = createDeferred();
  const cleanupFinished = createDeferred();
  initCore.mockImplementationOnce(() => {
    entered.resolve();
    return initializingCore.promise;
  });
  core.dispose.mockImplementationOnce(() => {
    cleanupStarted.resolve();
    return cleanupFinished.promise;
  });
  const initializing = HardwareSDKLowLevel.init({ env: 'webusb' });
  await entered.promise;
  const disposing = HardwareSDKLowLevel.dispose();
  const settled = jest.fn();
  const completion = disposing.then(settled);
  initializingCore.resolve(core);
  try {
    await Promise.race([cleanupStarted.promise, disposing]);
    expect(settled).not.toHaveBeenCalled();
  } finally {
    cleanupFinished.resolve();
  }
  await completion;
  expect(await initializing).toBe(false);
  expect(core.dispose).toHaveBeenCalledTimes(1);
  expect(core.listenerCount(CORE_EVENT)).toBe(0);
});

test('cancels initialization on disposal and lets the next initialization proceed', async () => {
  const started = createDeferred();
  initCore.mockImplementationOnce((_settings, _transport, _plugin, signal) => {
    started.resolve();
    return new Promise(resolve => {
      signal.addEventListener('abort', () => resolve(undefined), { once: true });
    });
  });

  const abandoned = HardwareSDKLowLevel.init({ env: 'webusb', fetchConfig: true });
  await started.promise;
  const disposing = HardwareSDKLowLevel.dispose();
  const restarted = HardwareSDKLowLevel.init({ env: 'webusb', fetchConfig: false });

  await expect(disposing).resolves.toBeUndefined();
  await expect(abandoned).resolves.toBe(false);
  await expect(restarted).resolves.toBe(true);
  expect(core.listenerCount(CORE_EVENT)).toBe(1);
});

test('binds the switch to its Core before waiting for the transport', async () => {
  await HardwareSDKLowLevel.init({ env: 'webusb' });
  const switching = HardwareSDKLowLevel.switchTransport('webusb');
  expect(switchTransport).toHaveBeenCalledWith({
    env: 'webusb',
    owner: core,
    loadTransport: expect.any(Function),
    plugin: undefined,
  });
  await switching;
});

test('preserves PIN and passphrase response correlation through the real Common adapter', async () => {
  await HardwareSDKLowLevel.init({ env: 'webusb' });
  core.handleMessage.mockResolvedValue(undefined);
  for (const type of [UI_RESPONSE.RECEIVE_PIN, UI_RESPONSE.RECEIVE_PASSPHRASE]) {
    const response = {
      type,
      payload: type === UI_RESPONSE.RECEIVE_PIN ? '' : { value: '', passphraseOnDevice: true },
      interactionId: 'synthetic-interaction',
      deviceId: 'synthetic-device',
    };
    HardwareSDKLowLevel.uiResponse(response);
    expect(core.handleMessage).toHaveBeenLastCalledWith({ ...response, event: UI_EVENT });
  }
});

test('transport switching waits for completion and propagates rejection', async () => {
  await HardwareSDKLowLevel.init({ env: 'webusb' });
  let finish;
  switchTransport.mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve;
    })
  );
  const settled = jest.fn();
  const switching = HardwareSDKLowLevel.switchTransport('webusb').then(settled);
  await Promise.resolve();
  await Promise.resolve();
  expect(settled).not.toHaveBeenCalled();
  finish();
  await switching;
  expect(settled).toHaveBeenCalledWith({ success: true, payload: {} });
  const failure = new Error('synthetic switch failure');
  switchTransport.mockRejectedValueOnce(failure);
  await expect(HardwareSDKLowLevel.switchTransport('webusb')).rejects.toBe(failure);
});

test('rejects unsupported react-native transport in Common SDK', async () => {
  await HardwareSDKLowLevel.init({ env: 'webusb' });
  switchTransport.mockImplementationOnce(async ({ loadTransport }) => {
    await loadTransport();
  });
  await expect(HardwareSDKLowLevel.switchTransport('react-native')).rejects.toMatchObject({
    errorCode: HardwareErrorCode.TransportNotConfigured,
  });
});
