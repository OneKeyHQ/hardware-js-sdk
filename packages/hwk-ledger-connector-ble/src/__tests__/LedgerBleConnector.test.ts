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
    function resolve(
      connector: LedgerBleConnector,
      descriptor: DeviceDescriptor
    ): string {
      return (connector as unknown as { _resolveConnectId(d: DeviceDescriptor): string })
        ._resolveConnectId(descriptor);
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

    it('falls back to descriptor.path when name has no hex suffix', () => {
      const c = new LedgerBleConnector();
      expect(
        resolve(c, {
          path: 'fallback-path',
          name: 'Nano X',
          transport: 'BLE',
        })
      ).toBe('fallback-path');
    });

    it('falls back to descriptor.path when name is absent', () => {
      const c = new LedgerBleConnector();
      expect(resolve(c, { path: 'only-path', transport: 'BLE' })).toBe('only-path');
    });
  });
});
