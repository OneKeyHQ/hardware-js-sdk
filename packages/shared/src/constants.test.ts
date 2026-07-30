import { isKnownTrezorWebUsbDevice, isOnekeyBluetoothDevice, isOnekeyDevice } from './constants';

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

  it('does not identify an unnamed FFFD or Find My advertisement as OneKey', () => {
    expect(isOnekeyBluetoothDevice({ name: 'Find My', serviceUuids: ['fffd'] })).toBe(false);
    expect(
      isOnekeyBluetoothDevice({ serviceUuids: ['0000fffd-0000-1000-8000-00805f9b34fb'] })
    ).toBe(false);
  });

  it('ignores FFFD even when the advertised name resembles OneKey', () => {
    expect(isOnekeyBluetoothDevice({ name: 'OneKey Pro 2', serviceUuids: ['fffd'] })).toBe(false);
  });

  it('keeps OneKey discovery on the communication service', () => {
    expect(
      isOnekeyBluetoothDevice({
        name: 'OneKey Pro 2',
        serviceUuids: ['00000001-0000-1000-8000-00805f9b34fb'],
      })
    ).toBe(true);
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
