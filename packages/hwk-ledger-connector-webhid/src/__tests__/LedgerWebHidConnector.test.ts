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
    function resolve(connector: LedgerWebHidConnector, descriptor: DeviceDescriptor): string {
      return (
        connector as unknown as { _resolveConnectId(d: DeviceDescriptor): string }
      )._resolveConnectId(descriptor);
    }

    it('uses descriptor.path directly for non-BLE (USB/HID) transports', () => {
      const c = new LedgerWebHidConnector();
      expect(resolve(c, { path: 'hid-uuid-123', name: 'Nano X a58f', transport: 'USB' })).toBe(
        'hid-uuid-123'
      );
    });

    it('uses descriptor.path for BLE-via-WebHID descriptors too', () => {
      const c = new LedgerWebHidConnector();
      expect(resolve(c, { path: 'ble-path', name: 'Nano X a58f', transport: 'BLE' })).toBe(
        'ble-path'
      );
    });

    it('keeps RN_BLE descriptor.path as connectId', () => {
      const c = new LedgerWebHidConnector();
      expect(
        resolve(c, {
          path: 'CC26DD6E-3493-1698-A22D-81FFA13FEA67',
          name: 'Nano X a58f',
          transport: 'RN_BLE',
        })
      ).toBe('CC26DD6E-3493-1698-A22D-81FFA13FEA67');
    });

    it('does not require a BLE name to resolve connectId', () => {
      const c = new LedgerWebHidConnector();
      expect(
        resolve(c, {
          path: 'CC26DD6E-3493-1698-A22D-81FFA13FEA67',
          name: 'Andox',
          transport: 'BLE',
        })
      ).toBe('CC26DD6E-3493-1698-A22D-81FFA13FEA67');
    });
  });
});
