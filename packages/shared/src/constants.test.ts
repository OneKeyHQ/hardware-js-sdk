import {
  canonicalizePro2BleAdvertisementName,
  createKnownBleUuidAliases,
  hasOnekeyCommunicationService,
  inferProtocolHintFromUsbId,
  isKnownTrezorWebUsbDevice,
  isOnekeyBluetoothDevice,
  isOnekeyDevice,
  isPro2FindMyAdvertisementName,
  isSameOnekeyBleName,
  matchesKnownBleUuid,
  normalizePro2FindMyAdvertisementName,
  resolveOneKeyUsbDevicePath,
} from './constants';

describe('hardware device identity filters', () => {
  it('accepts known OneKey BLE names', () => {
    expect(isOnekeyDevice('Touch A1B2')).toBe(true);
    expect(isOnekeyDevice('Pro A1B2')).toBe(true);
    expect(isOnekeyDevice('Neo A1B2')).toBe(true);
    expect(isOnekeyDevice('Pro2A1B2')).toBe(true);
    expect(isOnekeyDevice('Pro 2 A1B2')).toBe(true);
    expect(isOnekeyDevice('OneKeyPro2A1B2')).toBe(true);
    expect(isOnekeyDevice('OneKey Pro 2 A1B2')).toBe(true);
    expect(isOnekeyDevice('Neo22D8')).toBe(true);
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
        name: 'Pro 2 A1B2',
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
    expect(isOnekeyBluetoothDevice({ name: 'Pro2 - Find My' })).toBe(false);
    expect(isOnekeyBluetoothDevice({ name: 'Pro2 G12Z - Find My' })).toBe(false);
  });

  it('uses a broad Find My guard without broadening public name normalization', () => {
    expect(isPro2FindMyAdvertisementName('Pro2 Griffin - Find My')).toBe(true);
    expect(isPro2FindMyAdvertisementName('Pro2 Griffin')).toBe(false);
    expect(isPro2FindMyAdvertisementName('Pro2 22D8 - Find My')).toBe(true);
    expect(normalizePro2FindMyAdvertisementName('Pro2 Griffin - Find My')).toBe(
      'Pro2 Griffin - Find My'
    );
    expect(normalizePro2FindMyAdvertisementName('Pro2 22D8 - Find My')).toBe('Pro2 22D8');
  });

  it.each([
    ['Pro2 A1B2 - Find My', 'Pro2 A1B2'],
    ['Pro2 5E9D - Finde My', 'Pro2 5E9D'],
    ['  OneKey Pro 2 A1B2 Find My  ', '  OneKey Pro 2 A1B2'],
    ['OneKey Pro-2 22D8--Find-My', 'OneKey Pro-2 22D8'],
    ['Pro2 22D8FindMy', 'Pro2 22D8'],
    ['Pro2 22D8 - Fin', 'Pro2 22D8'],
    ['Pro2 22D8FindM', 'Pro2 22D8'],
    [`Pro2 22D8${'\t'.repeat(10_000)}Find My`, 'Pro2 22D8'],
    ['Pro2 A1B2', 'Pro2 A1B2'],
    ['Pro2 Griffin', 'Pro2 Griffin'],
    ['Find My', 'Find My'],
  ])('normalizes the public Pro2 advertisement name %s', (name, expected) => {
    expect(normalizePro2FindMyAdvertisementName(name)).toBe(expected);
  });

  it.each([
    ['Pro2 A1B2', 'Pro 2 A1B2'],
    ['Pro2A1B2', 'Pro 2 A1B2'],
    ['Pro 2 A1B2', 'Pro 2 A1B2'],
    ['Pro 2 0088', 'Pro 2 0088'],
    ['Pro2 22D8 - Find My', 'Pro 2 22D8'],
    ['Pro 2 A1B2 - Find My', 'Pro 2 A1B2'],
    ['OneKeyPro2A1B2', 'OneKey Pro 2 A1B2'],
    ['OneKey Pro 2 A1B2', 'OneKey Pro 2 A1B2'],
    ['OneKey Pro 2', 'OneKey Pro 2'],
    ['Pro A1B2', 'Pro A1B2'],
    ['Pro 22D8', 'Pro 22D8'],
    ['Pro 2D8F', 'Pro 2D8F'],
    ['OneKey Pro 22D8', 'OneKey Pro 22D8'],
    ['Neo 22D8', 'Neo 22D8'],
  ])('canonicalizes the public Pro2 advertisement name %s', (name, expected) => {
    expect(canonicalizePro2BleAdvertisementName(name)).toBe(expected);
  });

  it('treats compact and spaced Pro2 BLE names as the same device', () => {
    expect(isSameOnekeyBleName('Pro2 6136', 'Pro 2 6136')).toBe(true);
    expect(isSameOnekeyBleName('Pro2 6136 - Find My', 'Pro 2 6136')).toBe(true);
    expect(isSameOnekeyBleName('Pro 2 6136', 'Pro 2 0088')).toBe(false);
    expect(isSameOnekeyBleName('Pro A1B2', 'Pro 2 A1B2')).toBe(false);
    expect(isSameOnekeyBleName('Pro 22D8', 'Pro 22D8')).toBe(true);
    expect(isSameOnekeyBleName('Pro 22D8', 'Pro2 22D8')).toBe(false);
    expect(isSameOnekeyBleName('Pro 22D8', 'Pro 2 22D8')).toBe(false);
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

  it('hints Protocol V2 from the current Pro2/Neo USB ID only', () => {
    expect(inferProtocolHintFromUsbId(0x1209, 0x4f4c)).toBe('V2');
    expect(inferProtocolHintFromUsbId(0x1209, 0x53c1)).toBeUndefined();
    expect(inferProtocolHintFromUsbId(0x1209, 0x4f4a)).toBeUndefined();
    expect(inferProtocolHintFromUsbId(0x1209, 0x4f4b)).toBeUndefined();
  });

  it('uses the USB serial when present and synthesizes a path when firmware omits it', () => {
    expect(
      resolveOneKeyUsbDevicePath({
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        serialNumber: 'PRO2-SERIAL',
      })
    ).toBe('PRO2-SERIAL');
    expect(
      resolveOneKeyUsbDevicePath({
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Neo',
        serialNumber: '',
      })
    ).toBe('usb-1209-4f4c-onekey-neo');
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
