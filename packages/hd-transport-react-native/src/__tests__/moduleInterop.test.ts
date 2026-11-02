import { getConnectedDeviceIds } from '../BleManager';
import ReactNativeBleTransport from '../index';

jest.mock(
  'react-native',
  () => ({ PermissionsAndroid: {}, Platform: { OS: 'android' } }),
  { virtual: true }
);

jest.mock('react-native-ble-plx', () => ({
  BleError: class BleError extends Error {},
  BleErrorCode: {},
  BleManager: jest.fn(),
  ConnectionPriority: { Balanced: 0, High: 1, LowPower: 2 },
  ScanMode: { LowLatency: 2 },
}));

jest.mock('../subscribeBleOn', () => ({
  subscribeBleOn: jest.fn(),
}));

jest.mock('@onekeyfe/react-native-ble-utils', () => ({
  default: { getConnectedPeripherals: jest.fn(() => Promise.resolve([])) },
}));

jest.mock('@onekeyfe/hd-transport', () => {
  const actual = jest.requireActual('@onekeyfe/hd-transport');
  return { ...actual, __esModule: true, default: actual };
});

describe('CommonJS external module interop', () => {
  test('reads the BLE utilities singleton from its default export', async () => {
    await expect(getConnectedDeviceIds([])).resolves.toEqual([]);
  });

  test('configures both protocol schemas through the transport default export', () => {
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
    const schema = {
      nested: {
        Ping: { fields: {} },
        MessageType: { values: { MessageType_Ping: 60206 } },
      },
    };

    expect(() => transport.configure(schema)).not.toThrow();
    expect(() => transport.configureProtocolV2(schema)).not.toThrow();
    expect(transport.configured).toBe(true);
    expect(transport._messagesV2).toBeDefined();
  });
});
