import { EventEmitter } from 'events';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleErrorCode } from 'react-native-ble-plx';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { getConnectedDeviceIds } from '../BleManager';
import ReactNativeBleTransport from '../index';
import { subscribeBleOn } from '../subscribeBleOn';

jest.mock(
  'react-native',
  () => ({
    PermissionsAndroid: {
      PERMISSIONS: {
        BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
        BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
      },
      requestMultiple: jest.fn(),
    },
    Platform: { OS: 'ios' },
  }),
  { virtual: true }
);

jest.mock('react-native-ble-plx', () => ({
  BleError: class BleError extends Error {},
  BleErrorCode: {
    BluetoothUnsupported: 100,
    BluetoothUnauthorized: 101,
    BluetoothPoweredOff: 102,
    BluetoothInUnknownState: 103,
    ScanStartFailed: 600,
    LocationServicesDisabled: 601,
  },
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

describe('ReactNativeBleTransport scan error mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.assign(Platform, { OS: 'ios', Version: undefined });
  });

  test('checks Android Bluetooth permissions before waiting for adapter state', async () => {
    Object.assign(Platform, { OS: 'android', Version: 31 });
    jest.mocked(PermissionsAndroid).requestMultiple.mockResolvedValueOnce({
      [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]: 'denied',
      [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]: 'denied',
    });
    const transport = new ReactNativeBleTransport({});
    transport.blePlxManager = {} as never;
    transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());

    await expect(transport.enumerate()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleLocationError,
    });
    expect(subscribeBleOn).not.toHaveBeenCalled();
  });

  test.each([
    [BleErrorCode.BluetoothPoweredOff, HardwareErrorCode.BlePoweredOff],
    [BleErrorCode.BluetoothUnsupported, HardwareErrorCode.BleUnsupported],
    [BleErrorCode.BluetoothInUnknownState, HardwareErrorCode.BleScanError],
    [BleErrorCode.BluetoothUnauthorized, HardwareErrorCode.BleLocationError],
  ])('maps native BLE error %s to hardware error %s', async (nativeCode, errorCode) => {
    jest.mocked(getConnectedDeviceIds).mockResolvedValueOnce([]);
    const blePlxManager = {
      startDeviceScan: jest.fn((_serviceUUIDs, _options, listener) => {
        queueMicrotask(() => {
          listener({ errorCode: nativeCode, reason: 'native scan failure' }, null);
        });
      }),
      stopDeviceScan: jest.fn(() => Promise.resolve()),
    };
    const transport = new ReactNativeBleTransport({ scanTimeout: 10_000 });
    transport.blePlxManager = blePlxManager as never;
    transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());

    await expect(transport.enumerate()).rejects.toMatchObject({ errorCode });
    expect(blePlxManager.stopDeviceScan).toHaveBeenCalledTimes(1);
  });
});

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

describe('ReactNativeBleTransport advertisement color', () => {
  const PRO2_SERVICE_UUIDS = [
    '0000180a-0000-1000-8000-00805f9b34fb',
    '0000180f-0000-1000-8000-00805f9b34fb',
    '0000fffd-0000-1000-8000-00805f9b34fb',
    ONEKEY_SERVICE_UUID,
  ];
  const manufacturerData = (bytes: number[]) => Buffer.from(bytes).toString('base64');

  const scanOnce = async (advertisements: Record<string, unknown>[]) => {
    const blePlxManager = {
      startDeviceScan: jest.fn((_serviceUUIDs, _options, listener) => {
        queueMicrotask(() => {
          advertisements.forEach(advertisement => listener(null, advertisement));
        });
      }),
      stopDeviceScan: jest.fn(),
    };
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
    transport.blePlxManager = blePlxManager as never;
    transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());
    return transport.enumerate();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getConnectedDeviceIds).mockResolvedValue([]);
  });

  afterEach(() => {
    Object.assign(Platform, { OS: 'ios', Version: undefined });
  });

  test('keeps the color from an unnamed iOS advertisement for the named device', async () => {
    const devices = await scanOnce([
      {
        id: 'COLOR-UNNAMED',
        name: null,
        localName: null,
        serviceUUIDs: PRO2_SERVICE_UUIDS,
        manufacturerData: manufacturerData([0x42, 0, 0, 0, 0]),
      },
      {
        id: 'COLOR-UNNAMED',
        name: 'Pro 2 769D',
        localName: 'Pro 2 769D',
        serviceUUIDs: PRO2_SERVICE_UUIDS,
        manufacturerData: null,
      },
    ]);

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ id: 'COLOR-UNNAMED', bleColorCode: 'B' });
  });

  test('fills a later color without letting a legacy payload clear it', async () => {
    Object.assign(Platform, { OS: 'android', Version: 30 });

    const devices = await scanOnce([
      {
        id: 'AA:BB:CC:00:00:01',
        name: 'Neo 1A2B',
        serviceUUIDs: PRO2_SERVICE_UUIDS,
        manufacturerData: null,
      },
      {
        id: 'AA:BB:CC:00:00:01',
        name: 'Neo 1A2B',
        serviceUUIDs: PRO2_SERVICE_UUIDS,
        manufacturerData: manufacturerData([0x45, 0, 0, 0, 0]),
      },
      {
        id: 'AA:BB:CC:00:00:01',
        name: 'Neo 1A2B',
        serviceUUIDs: PRO2_SERVICE_UUIDS,
        manufacturerData: manufacturerData([0, 0, 0, 0]),
      },
    ]);

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ id: 'AA:BB:CC:00:00:01', bleColorCode: 'E' });
  });

  test('reports no color for legacy, unset or undecodable payloads', async () => {
    const devices = await scanOnce([
      {
        id: 'LEGACY-NONCE',
        name: 'Pro 2 0001',
        serviceUUIDs: PRO2_SERVICE_UUIDS,
        manufacturerData: manufacturerData([0, 0, 0, 0]),
      },
      {
        id: 'SN-NOT-SYNCED',
        name: 'Pro 2 0002',
        serviceUUIDs: PRO2_SERVICE_UUIDS,
        manufacturerData: manufacturerData([0, 0, 0, 0, 0]),
      },
      {
        id: 'INVALID-BASE64',
        name: 'Pro 2 0003',
        serviceUUIDs: PRO2_SERVICE_UUIDS,
        manufacturerData: '%%%',
      },
    ]);

    expect(devices.map(device => device.id)).toEqual([
      'LEGACY-NONCE',
      'SN-NOT-SYNCED',
      'INVALID-BASE64',
    ]);
    devices.forEach(device => expect(device).not.toHaveProperty('bleColorCode'));
  });

  test('reuses an earlier color for a connected peripheral that no longer advertises', async () => {
    await scanOnce([
      {
        id: 'CONNECTED-NEO',
        name: 'Neo 3C4D',
        serviceUUIDs: PRO2_SERVICE_UUIDS,
        manufacturerData: manufacturerData([0x46, 0, 0, 0, 0]),
      },
    ]);
    // iOS reports already-connected peripherals with lowercased ids.
    jest.mocked(getConnectedDeviceIds).mockResolvedValueOnce([
      {
        id: 'connected-neo',
        name: 'Neo 3C4D',
        localName: null,
        serviceUUIDs: [ONEKEY_SERVICE_UUID],
      },
    ] as never);

    const devices = await scanOnce([]);

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ id: 'connected-neo', bleColorCode: 'F' });
  });
});
