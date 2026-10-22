import EventEmitter from 'events';
import {
  CORE_EVENT,
  DEVICE,
  DEVICE_EVENT,
  UI_EVENT,
  UI_REQUEST,
  IFRAME,
  initCore,
  switchTransport,
} from '@onekeyfe/hd-core';

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
    undefined
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
    Transport: expect.anything(),
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
    undefined
  );
});
