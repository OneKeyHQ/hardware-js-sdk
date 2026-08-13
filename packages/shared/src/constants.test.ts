import {
  createKnownBleUuidAliases,
  hasOnekeyCommunicationService,
  isKnownTrezorWebUsbDevice,
  isOnekeyBluetoothDevice,
  isOnekeyDevice,
  matchesKnownBleUuid,
  normalizePro2FindMyAdvertisementName,
} from './constants';

describe('hardware device identity filters', () => {
  it('accepts known OneKey BLE names', () => {
    expect(isOnekeyDevice('Touch A1B2')).toBe(true);
    expect(isOnekeyDevice('Pro A1B2')).toBe(true);
    expect(isOnekeyDevice('Neo A1B2')).toBe(true);
    expect(isOnekeyDevice('K1234')).toBe(true);
    expect(isOnekeyDevice('S8')).toBe(true);
  });

  it('rejects known Trezor and Ledger BLE names from OneKey discovery', () => {
    expect(isOnekeyDevice('Trezor Safe 7')).toBe(false);
    expect(isOnekeyDevice('Ledger Nano X')).toBe(false);
  });

  it('does not identify an FFFD-only advertisement as OneKey', () => {
    expect(isOnekeyBluetoothDevice({ name: 'Find My', serviceUuids: ['fffd'] })).toBe(false);
    expect(
      isOnekeyBluetoothDevice({ serviceUuids: ['0000fffd-0000-1000-8000-00805f9b34fb'] })
    ).toBe(false);
  });

  it('identifies Pro2 communication advertisements independently of their display name', () => {
    expect(
      isOnekeyBluetoothDevice({
        name: 'Pro2 A1B2',
        serviceUuids: ['0001', 'fffd'],
      })
    ).toBe(true);
    expect(
      isOnekeyBluetoothDevice({
        localName: 'Pro2 A1B2 - Find My',
        serviceUuids: ['0001', 'fffd'],
      })
    ).toBe(true);
    expect(
      isOnekeyBluetoothDevice({
        name: 'Pro2 5E9D - Finde My',
        serviceUuids: ['0001', 'fffd'],
      })
    ).toBe(true);
  });

  it('rejects Pro2 Find My entries when the communication service is absent', () => {
    expect(
      isOnekeyBluetoothDevice({
        name: 'Pro2 A1B2 - Find My',
      })
    ).toBe(false);
    expect(
      isOnekeyBluetoothDevice({
        localName: 'OneKey Pro 2 A1B2 - Find My',
        serviceUuids: [],
      })
    ).toBe(false);
    expect(
      isOnekeyBluetoothDevice({
        name: 'Pro2 5E9D - Finde My',
        serviceUuids: ['fffd'],
      })
    ).toBe(false);
  });

  it.each([
    ['Pro2 A1B2 - Find My', 'Pro2 A1B2'],
    ['Pro2 5E9D - Finde My', 'Pro2 5E9D'],
    ['  OneKey Pro 2 A1B2 Find My  ', '  OneKey Pro 2 A1B2'],
    ['Pro2 A1B2', 'Pro2 A1B2'],
    ['Find My', 'Find My'],
  ])('normalizes the public Pro2 advertisement name %s', (name, expected) => {
    expect(normalizePro2FindMyAdvertisementName(name)).toBe(expected);
  });

  it('keeps OneKey discovery on the communication service', () => {
    expect(
      isOnekeyBluetoothDevice({
        name: 'OneKey Pro 2',
        serviceUuids: ['00000001-0000-1000-8000-00805f9b34fb'],
      })
    ).toBe(true);
  });

  it('only aliases standard Bluetooth Base UUID representations', () => {
    const aliases = createKnownBleUuidAliases('00000001-0000-1000-8000-00805f9b34fb');

    expect(matchesKnownBleUuid('0001', aliases)).toBe(true);
    expect(matchesKnownBleUuid('00000001', aliases)).toBe(true);
    expect(matchesKnownBleUuid('abcd0001-1234-5678-9012-abcdefabcdef', aliases)).toBe(false);
  });

  it('does not treat vendor-specific UUID fragments as communication or FIDO services', () => {
    expect(
      isOnekeyBluetoothDevice({
        name: 'OneKey Pro 2',
        serviceUuids: ['abcdfffd-1234-5678-9012-abcdefabcdef'],
      })
    ).toBe(true);
    expect(
      isOnekeyBluetoothDevice({
        serviceUuids: ['abcd0001-1234-5678-9012-abcdefabcdef'],
      })
    ).toBe(false);
  });

  it('requires an explicitly advertised communication service for strict discovery', () => {
    expect(hasOnekeyCommunicationService([])).toBe(false);
    expect(hasOnekeyCommunicationService(['0001'])).toBe(true);
    expect(hasOnekeyCommunicationService(['abcd0001-1234-5678-9012-abcdefabcdef'])).toBe(false);
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
