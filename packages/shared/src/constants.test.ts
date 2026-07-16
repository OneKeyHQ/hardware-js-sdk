import { isKnownTrezorWebUsbDevice, isOnekeyDevice } from './constants';

describe('hardware device identity filters', () => {
  it('accepts known OneKey BLE names', () => {
    expect(isOnekeyDevice('Touch A1B2')).toBe(true);
    expect(isOnekeyDevice('Pro A1B2')).toBe(true);
    expect(isOnekeyDevice('K1234')).toBe(true);
    expect(isOnekeyDevice('S8')).toBe(true);
  });

  it('rejects known Trezor and Ledger BLE names from OneKey discovery', () => {
    expect(isOnekeyDevice('Trezor Safe 7')).toBe(false);
    expect(isOnekeyDevice('Ledger Nano X')).toBe(false);
  });

  it('only filters WebUSB descriptors that are explicitly identified as Trezor', () => {
    expect(
      isKnownTrezorWebUsbDevice({
        vendorId: 0x1209,
        productId: 0x53c1,
        manufacturerName: 'Trezor Company',
      })
    ).toBe(true);
    expect(
      isKnownTrezorWebUsbDevice({
        vendorId: 0x1209,
        productId: 0x53c1,
        manufacturerName: 'Trezor',
      })
    ).toBe(true);
    expect(
      isKnownTrezorWebUsbDevice({
        vendorId: 0x1209,
        productId: 0x53c1,
        manufacturerName: 'SatoshiLabs',
      })
    ).toBe(true);

    expect(
      isKnownTrezorWebUsbDevice({
        vendorId: 0x1209,
        productId: 0x53c1,
        manufacturerName: 'OneKey',
      })
    ).toBe(false);
    expect(
      isKnownTrezorWebUsbDevice({
        vendorId: 0x1209,
        productId: 0x53c1,
      })
    ).toBe(false);
    expect(
      isKnownTrezorWebUsbDevice({
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'Trezor Safe 7',
      })
    ).toBe(false);
  });
});
