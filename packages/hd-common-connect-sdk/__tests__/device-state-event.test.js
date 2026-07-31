import { CORE_EVENT, DEVICE, DEVICE_EVENT, initCore } from '@onekeyfe/hd-core';

import HardwareCommonConnectSdk from '../src';

jest.mock('@onekeyfe/hd-core', () => {
  const actual = jest.requireActual('@onekeyfe/hd-core');
  return {
    __esModule: true,
    ...actual,
    default: ({ eventEmitter, init, dispose }) => ({
      init,
      dispose,
      on: (type, listener) => eventEmitter.on(type, listener),
      off: (type, listener) => eventEmitter.off(type, listener),
      removeAllListeners: type => eventEmitter.removeAllListeners(type),
    }),
    initCore: jest.fn(),
  };
});

describe('hd-common-connect-sdk device state events', () => {
  test('forwards KnownDevice connect and disconnect payload wrappers to SDK consumers', async () => {
    let handleCoreMessage;
    const core = {
      on: jest.fn((event, listener) => {
        if (event === CORE_EVENT) {
          handleCoreMessage = listener;
        }
      }),
      dispose: jest.fn(),
    };
    initCore.mockResolvedValue(core);
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    HardwareCommonConnectSdk.on(DEVICE.CONNECT, onConnect);
    HardwareCommonConnectSdk.on(DEVICE.DISCONNECT, onDisconnect);

    await HardwareCommonConnectSdk.init({ env: 'lowlevel' });
    const device = {
      connectId: 'ble-connect-id',
      serialNo: 'SERIAL-001',
      uuid: 'SERIAL-001',
      label: 'OneKey Test',
    };
    const payload = { device };

    handleCoreMessage({
      event: DEVICE_EVENT,
      type: DEVICE.CONNECT,
      payload,
    });
    handleCoreMessage({
      event: DEVICE_EVENT,
      type: DEVICE.DISCONNECT,
      payload,
    });

    expect(onConnect).toHaveBeenCalledWith(payload);
    expect(onDisconnect).toHaveBeenCalledWith(payload);
    HardwareCommonConnectSdk.removeAllListeners(DEVICE.CONNECT);
    HardwareCommonConnectSdk.removeAllListeners(DEVICE.DISCONNECT);
    await HardwareCommonConnectSdk.dispose();
  });

  test('forwards Protocol V2 DEVICE.STATE payloads to SDK consumers', async () => {
    let handleCoreMessage;
    const core = {
      on: jest.fn((event, listener) => {
        if (event === CORE_EVENT) {
          handleCoreMessage = listener;
        }
      }),
      dispose: jest.fn(),
    };
    initCore.mockResolvedValue(core);
    const listener = jest.fn();
    HardwareCommonConnectSdk.on(DEVICE.STATE, listener);

    await HardwareCommonConnectSdk.init({ env: 'webusb' });
    const payload = {
      connectId: 'connect-id',
      revision: 1,
      source: 'device-info',
      changedKeys: ['protocolVersion'],
      state: { protocol: 'V2', protocolVersion: 2 },
    };
    handleCoreMessage({
      event: DEVICE_EVENT,
      type: DEVICE.STATE,
      payload,
    });

    expect(listener).toHaveBeenCalledWith(payload);
    HardwareCommonConnectSdk.removeAllListeners(DEVICE.STATE);
    await HardwareCommonConnectSdk.dispose();
  });
});
