import { EventEmitter } from 'events';

import { getConnectedDeviceIds } from '../BleManager';
import ReactNativeBleTransport from '../index';

jest.mock(
  'react-native',
  () => ({
    PermissionsAndroid: {},
    Platform: { OS: 'ios' },
  }),
  { virtual: true }
);

jest.mock('react-native-ble-plx', () => ({
  BleError: class BleError extends Error {},
  BleErrorCode: {},
  BleManager: jest.fn(),
  ScanMode: { LowLatency: 2 },
}));

jest.mock('../BleManager', () => ({
  getConnectedDeviceIds: jest.fn(),
  onDeviceBondState: jest.fn(),
  pairDevice: jest.fn(),
}));

jest.mock('../subscribeBleOn', () => ({
  subscribeBleOn: jest.fn(() => Promise.resolve()),
}));

const ONEKEY_SERVICE_UUID = '00000001-0000-1000-8000-00805f9b34fb';

describe('ReactNativeBleTransport iOS discovery', () => {
  test('keeps a bonded Pro2 communication peripheral after Find My changes its name', async () => {
    jest.mocked(getConnectedDeviceIds).mockResolvedValueOnce([
      {
        id: 'wallet-peripheral',
        name: 'Pro2 6E9E - Find My',
        localName: null,
        serviceUUIDs: [ONEKEY_SERVICE_UUID],
      },
    ] as never);
    const blePlxManager = {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
    };
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
    transport.blePlxManager = blePlxManager as never;
    transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());

    const devices = await transport.enumerate();

    expect(devices.map(device => device.id)).toEqual(['wallet-peripheral']);
  });

  test('uses services to distinguish a Pro2 communication peripheral from Find My', async () => {
    jest.mocked(getConnectedDeviceIds).mockResolvedValueOnce([]);
    const blePlxManager = {
      startDeviceScan: jest.fn((_serviceUUIDs, _options, listener) => {
        queueMicrotask(() => {
          listener(null, {
            id: 'find-my-peripheral',
            name: 'Pro2 6E9E - Find My',
            localName: null,
            serviceUUIDs: ['0000fffd-0000-1000-8000-00805f9b34fb'],
          });
          listener(null, {
            id: 'wallet-peripheral',
            name: 'Pro2 6E9E - Find My',
            localName: null,
            serviceUUIDs: [ONEKEY_SERVICE_UUID],
          });
        });
      }),
      stopDeviceScan: jest.fn(),
    };
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
    transport.blePlxManager = blePlxManager as never;
    transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());

    const devices = await transport.enumerate();

    expect(devices.map(device => device.id)).toEqual(['wallet-peripheral']);
  });

  test('keeps a service-filtered Pro2 scan result when ble-plx omits service UUIDs', async () => {
    jest.mocked(getConnectedDeviceIds).mockResolvedValueOnce([]);
    const blePlxManager = {
      startDeviceScan: jest.fn((_serviceUUIDs, _options, listener) => {
        queueMicrotask(() => {
          listener(null, {
            id: 'wallet-peripheral',
            name: 'Pro2 6E9E - Find My',
            localName: null,
            serviceUUIDs: null,
          });
        });
      }),
      stopDeviceScan: jest.fn(),
    };
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
    transport.blePlxManager = blePlxManager as never;
    transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());

    const devices = await transport.enumerate();

    expect(devices.map(device => device.id)).toEqual(['wallet-peripheral']);
  });

  test('ignores an unnamed scanned advertisement while keeping the named wallet peripheral', async () => {
    jest.mocked(getConnectedDeviceIds).mockResolvedValueOnce([]);
    const blePlxManager = {
      startDeviceScan: jest.fn((_serviceUUIDs, _options, listener) => {
        queueMicrotask(() => {
          listener(null, {
            id: 'unnamed-peripheral',
            name: null,
            localName: null,
            serviceUUIDs: [
              '0000180a-0000-1000-8000-00805f9b34fb',
              '0000180f-0000-1000-8000-00805f9b34fb',
              '0000fffd-0000-1000-8000-00805f9b34fb',
              ONEKEY_SERVICE_UUID,
            ],
          });
          listener(null, {
            id: 'wallet-peripheral',
            name: 'Pro2 769D',
            localName: 'Pro2 769D',
            serviceUUIDs: [
              '0000180a-0000-1000-8000-00805f9b34fb',
              '0000180f-0000-1000-8000-00805f9b34fb',
              '0000fffd-0000-1000-8000-00805f9b34fb',
              ONEKEY_SERVICE_UUID,
            ],
          });
        });
      }),
      stopDeviceScan: jest.fn(),
    };
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
    transport.blePlxManager = blePlxManager as never;
    transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());

    const devices = await transport.enumerate();

    expect(devices.map(device => device.id)).toEqual(['wallet-peripheral']);
  });
});
