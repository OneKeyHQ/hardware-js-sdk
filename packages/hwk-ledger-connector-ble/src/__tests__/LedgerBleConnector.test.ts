jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }), { virtual: true });

import { LedgerBleConnector } from '../LedgerBleConnector';

import type { DeviceDescriptor } from '@onekeyfe/hwk-adapter-core';

describe('LedgerBleConnector', () => {
  it('constructs without throwing', () => {
    expect(() => new LedgerBleConnector()).not.toThrow();
  });

  it('declares ble connectionType', () => {
    expect(new LedgerBleConnector().connectionType).toBe('ble');
  });

  describe('_resolveConnectId', () => {
    // _resolveConnectId is protected; tests reach it via an `as any` cast.
    function resolve(connector: LedgerBleConnector, descriptor: DeviceDescriptor): string {
      return (
        connector as unknown as { _resolveConnectId(d: DeviceDescriptor): string }
      )._resolveConnectId(descriptor);
    }

    it('uses the transport path as BLE connectId instead of the BLE name', () => {
      const c = new LedgerBleConnector();
      expect(
        resolve(c, {
          path: 'D5:75:7D:4B:51:E8',
          name: 'Nano X a58f',
          transport: 'BLE',
        })
      ).toBe('D5:75:7D:4B:51:E8');
    });

    it('keeps Android/iOS RN BLE transport ids as connectId even when bleName exists', () => {
      const c = new LedgerBleConnector();
      expect(
        resolve(c, {
          path: 'D5:75:7D:4B:51:E8',
          name: 'Nano X 123',
          bleName: 'A58F',
          localName: 'Nano X 123',
          transport: 'RN_BLE',
        })
      ).toBe('D5:75:7D:4B:51:E8');
    });

    it('does not require a four-character BLE name to resolve connectId', () => {
      const c = new LedgerBleConnector();
      expect(resolve(c, { path: 'only-path', transport: 'RN_BLE', name: 'nano X123' })).toBe(
        'only-path'
      );
    });
  });
});
