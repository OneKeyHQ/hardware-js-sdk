import { BleErrorCode } from 'react-native-ble-plx';
import { Platform } from 'react-native';

import BleTransport from '../BleTransport';

jest.mock(
  'react-native',
  () => ({
    Platform: { OS: 'ios' },
  }),
  { virtual: true }
);

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
  beforeEach(() => {
    Platform.OS = 'ios';
  });

  test('does not reconnect or replay after the device disconnects', async () => {
    const error = Object.assign(new Error('device disconnected'), {
      errorCode: BleErrorCode.DeviceDisconnected,
    });
    const writeCharacteristic = {
      isWritableWithResponse: true,
      writeWithResponse: jest.fn(() => Promise.resolve()),
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

  test('keeps iOS bulk transfer on writeWithoutResponse even when the characteristic supports responses', async () => {
    // writeWithResponse serialises every packet into its own connection-interval
    // round trip. On a ~1.7MB firmware (~13.5k packets) that stalled the upload past
    // the 600s app-level timeout, so bulk transfer must never opt into it.
    const writeCharacteristic = {
      isWritableWithResponse: true,
      writeWithResponse: jest.fn(() => Promise.resolve()),
      writeWithoutResponse: jest.fn(() => Promise.resolve()),
    };
    const transport = new BleTransport(
      { id: 'classic-id' } as any,
      writeCharacteristic as any,
      {} as any
    );

    await transport.writeWithRetry('payload');

    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledWith('payload');
  });

  test('keeps Android Protocol V1 writes on writeWithoutResponse', async () => {
    Platform.OS = 'android';
    const writeCharacteristic = {
      isWritableWithResponse: true,
      writeWithResponse: jest.fn(() => Promise.resolve()),
      writeWithoutResponse: jest.fn(() => Promise.resolve()),
    };
    const transport = new BleTransport(
      { id: 'classic-id' } as any,
      writeCharacteristic as any,
      {} as any
    );

    await transport.writeWithRetry('payload');

    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledWith('payload');
  });

  test('uses writeWithoutResponse on iOS when the characteristic lacks response support', async () => {
    const writeCharacteristic = {
      isWritableWithResponse: false,
      writeWithResponse: jest.fn(() => Promise.resolve()),
      writeWithoutResponse: jest.fn(() => Promise.resolve()),
    };
    const transport = new BleTransport(
      { id: 'classic-id' } as any,
      writeCharacteristic as any,
      {} as any
    );

    await transport.writeWithRetry('payload');

    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledWith('payload');
  });
});
