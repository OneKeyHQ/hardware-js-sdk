import { createKnownBleUuidAliases, matchesKnownBleUuid } from '../ble-uuid';

describe('Electron BLE UUID aliases', () => {
  const notifyAliases = createKnownBleUuidAliases('00000003-0000-1000-8000-00805f9b34fb');

  test.each([
    '0003',
    '00000003',
    '0000000300001000800000805f9b34fb',
    '00000003-0000-1000-8000-00805F9B34FB',
  ])('matches a known Bluetooth UUID representation: %s', uuid => {
    expect(matchesKnownBleUuid(uuid, notifyAliases)).toBe(true);
  });

  test.each([
    'abcd0003-1234-5678-9012-abcdefabcdef',
    'ffff0003',
    '1000000300001000800000805f9b34fb',
  ])('rejects a UUID that only contains the same short key: %s', uuid => {
    expect(matchesKnownBleUuid(uuid, notifyAliases)).toBe(false);
  });

  test('does not shorten a vendor-specific UUID', () => {
    const vendorAliases = createKnownBleUuidAliases('abcd0003-1234-5678-9012-abcdefabcdef');

    expect(vendorAliases).toEqual(new Set(['abcd0003123456789012abcdefabcdef']));
  });
});
