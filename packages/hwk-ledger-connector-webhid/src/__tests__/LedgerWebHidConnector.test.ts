import { LedgerWebHidConnector } from '../LedgerWebHidConnector';

import type { DeviceDescriptor } from '@onekeyfe/hwk-adapter-core';

describe('LedgerWebHidConnector', () => {
  it('constructs without throwing', () => {
    expect(() => new LedgerWebHidConnector()).not.toThrow();
  });

  it('declares usb connectionType', () => {
    expect(new LedgerWebHidConnector().connectionType).toBe('usb');
  });

  describe('_resolveConnectId', () => {
    function resolve(
      connector: LedgerWebHidConnector,
      descriptor: DeviceDescriptor
    ): string {
      return (connector as unknown as { _resolveConnectId(d: DeviceDescriptor): string })
        ._resolveConnectId(descriptor);
    }

    it('uses descriptor.path directly for non-BLE (USB/HID) transports', () => {
      const c = new LedgerWebHidConnector();
      expect(
        resolve(c, { path: 'hid-uuid-123', name: 'Nano X a58f', transport: 'USB' })
      ).toBe('hid-uuid-123');
    });

    it('extracts 4-hex suffix for BLE-via-WebHID descriptors', () => {
      const c = new LedgerWebHidConnector();
      expect(
        resolve(c, { path: 'ble-path', name: 'Nano X a58f', transport: 'BLE' })
      ).toBe('A58F');
    });

    it('falls back to descriptor.path when BLE name has no hex suffix', () => {
      const c = new LedgerWebHidConnector();
      expect(
        resolve(c, { path: 'ble-fallback', name: 'Nano X', transport: 'BLE' })
      ).toBe('ble-fallback');
    });
  });
});
