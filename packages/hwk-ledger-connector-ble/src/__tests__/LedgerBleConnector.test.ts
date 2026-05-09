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

    it('extracts 4-hex suffix from device name and uppercases it', () => {
      const c = new LedgerBleConnector();
      expect(
        resolve(c, {
          path: 'D5:75:7D:4B:51:E8',
          name: 'Nano X a58f',
          transport: 'BLE',
        })
      ).toBe('A58F');
    });

    it('prefers the explicit RN BLE identifier over the display name', () => {
      const c = new LedgerBleConnector();
      expect(
        resolve(c, {
          path: 'D5:75:7D:4B:51:E8',
          name: 'Nano X 123',
          bleName: 'A58F',
          localName: 'Nano X 123',
          transport: 'RN_BLE',
        })
      ).toBe('A58F');
    });

    it('does not derive BLE identity from descriptor.path', () => {
      const c = new LedgerBleConnector();
      expect(
        resolve(c, {
          path: 'ACE4CF88-3DC0-E39F-1E5C-CC707B1E3F64',
          name: 'Leo',
          transport: 'BLE',
        })
      ).toBe('');
    });

    it('returns empty connectId when BLE name has no four-character suffix', () => {
      const c = new LedgerBleConnector();
      expect(resolve(c, { path: 'only-path', transport: 'RN_BLE', name: 'nano X123' })).toBe('');
    });
  });
});
