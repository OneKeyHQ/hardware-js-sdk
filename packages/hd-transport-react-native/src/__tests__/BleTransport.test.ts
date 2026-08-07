import { BleErrorCode } from 'react-native-ble-plx';

import BleTransport from '../BleTransport';

jest.mock(
  'react-native-ble-plx',
  () => ({
    BleErrorCode: {
      DeviceDisconnected: 205,
      CharacteristicNotFound: 404,
    },
  }),
  { virtual: true }
);

jest.mock('@onekeyfe/hd-shared', () => ({
  ...jest.requireActual('@onekeyfe/hd-shared'),
  wait: jest.fn(() => Promise.resolve()),
}));

describe('BleTransport side-effecting writes', () => {
  test('does not reconnect or replay after the device disconnects', async () => {
    const error = Object.assign(new Error('device disconnected'), {
      errorCode: BleErrorCode.DeviceDisconnected,
    });
    const writeCharacteristic = {
      writeWithoutResponse: jest.fn(() => Promise.reject(error)),
    };
    const device = {
      id: 'classic-id',
      connect: jest.fn(() => Promise.resolve()),
      discoverAllServicesAndCharacteristics: jest.fn(() => Promise.resolve()),
    };
    const transport = new BleTransport(device as any, writeCharacteristic as any, {} as any);

    await expect(transport.writeWithRetry('payload')).rejects.toBe(error);

    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(1);
    expect(device.connect).not.toHaveBeenCalled();
  });
});
