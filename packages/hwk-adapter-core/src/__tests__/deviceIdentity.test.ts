import { detectHardwareVendorFromDescriptor } from '../utils/deviceIdentity';

describe('detectHardwareVendorFromDescriptor', () => {
  it('does not classify shared OneKey/Trezor WebUSB VID/PID without more identity fields', () => {
    expect(
      detectHardwareVendorFromDescriptor({
        vendorId: 0x1209,
        productId: 0x53c1,
      })
    ).toBeUndefined();
  });

  it('detects vendors from BLE service UUIDs', () => {
    expect(
      detectHardwareVendorFromDescriptor({
        serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
      })
    ).toBe('onekey');
    expect(
      detectHardwareVendorFromDescriptor({
        serviceUUIDs: ['8c000001-a59b-4d58-a9ad-073df69fa1b1'],
      })
    ).toBe('trezor');
  });

  it('detects Ledger from its USB vendor id', () => {
    expect(detectHardwareVendorFromDescriptor({ vendorId: 0x2c97 })).toBe('ledger');
  });

  it('detects Keystone only from the full VID/PID pair on the shared pid.codes VID', () => {
    expect(detectHardwareVendorFromDescriptor({ vendorId: 0x1209, productId: 0x3001 })).toBe(
      'keystone'
    );
    expect(detectHardwareVendorFromDescriptor({ vendor: 0x1209, product: 0x3001 })).toBe(
      'keystone'
    );
    expect(detectHardwareVendorFromDescriptor({ vendorId: 0x1209 })).toBeUndefined();
    expect(detectHardwareVendorFromDescriptor({ productId: 0x3001 })).toBeUndefined();
  });

  it('detects Keystone from its USB manufacturer name', () => {
    expect(detectHardwareVendorFromDescriptor({ manufacturerName: 'Keystone' })).toBe('keystone');
  });

  it('detects OneKey and Trezor from stable USB manufacturer names', () => {
    expect(detectHardwareVendorFromDescriptor({ manufacturerName: 'OneKey' })).toBe('onekey');
    expect(detectHardwareVendorFromDescriptor({ manufacturerName: 'Trezor Company' })).toBe(
      'trezor'
    );
  });

  it('does not classify OneKey or Trezor from model-like fields', () => {
    expect(detectHardwareVendorFromDescriptor({ productName: 'OneKey Pro' })).toBeUndefined();
    expect(detectHardwareVendorFromDescriptor({ productName: 'Trezor Safe 7' })).toBeUndefined();
    expect(detectHardwareVendorFromDescriptor({ label: 'OneKey Classic 1S' })).toBeUndefined();
    expect(detectHardwareVendorFromDescriptor({ model: 'Safe 7' })).toBeUndefined();
    expect(detectHardwareVendorFromDescriptor({ internal_model: 'T3W1' })).toBeUndefined();
    expect(detectHardwareVendorFromDescriptor({ product: 'classic1s' })).toBeUndefined();
  });

  it('detects OneKey features before generic trezor.io compatibility vendor', () => {
    expect(
      detectHardwareVendorFromDescriptor({
        vendor: 'trezor.io',
        fw_vendor: 'OneKey',
        label: 'OneKey Classic 1S',
        product: 'classic1s',
        onekey_version: '3.19.0',
        onekey_device_type: 'CLASSIC1S',
      })
    ).toBe('onekey');
  });

  it('detects OneKey from stable OneKey-only feature fields', () => {
    expect(detectHardwareVendorFromDescriptor({ onekey_version: '3.19.0' })).toBe('onekey');
    expect(detectHardwareVendorFromDescriptor({ onekey_device_type: 'CLASSIC1S' })).toBe('onekey');
    expect(detectHardwareVendorFromDescriptor({ onekey_serial: 'CLA45F0014' })).toBe('onekey');
  });

  it('detects Trezor features from Trezor-specific firmware fields', () => {
    expect(
      detectHardwareVendorFromDescriptor({
        vendor: 'trezor.io',
        fw_vendor: 'Trezor',
        model: 'Safe 7',
        internal_model: 'T3W1',
      })
    ).toBe('trezor');
  });
});
