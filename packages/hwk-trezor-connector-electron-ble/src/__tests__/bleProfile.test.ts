import { DEFAULT_THIRD_PARTY_BLE_VENDORS } from '@onekeyfe/hwk-desktop-noble-ble';

import { TREZOR_BLE_CONNECT_PROFILE, TREZOR_BLE_MATCH, TREZOR_BLE_VENDOR } from '../bleProfile';

// The desktop main process keeps its own copy of the Trezor GATT profile; this pins the two.
describe('Trezor BLE profile against the desktop vendor allowlist', () => {
  const vendor = DEFAULT_THIRD_PARTY_BLE_VENDORS[TREZOR_BLE_VENDOR];

  test('accepts the connect profile', () => {
    expect(vendor.acceptsConnect(TREZOR_BLE_CONNECT_PROFILE)).toBe(true);
  });

  test('accepts the scanned service uuid', () => {
    expect(TREZOR_BLE_MATCH.serviceUuids?.length).toBeGreaterThan(0);
    for (const uuid of TREZOR_BLE_MATCH.serviceUuids ?? []) {
      expect(vendor.isServiceUuid(uuid)).toBe(true);
    }
  });

  test.each([
    'Trezor Safe 7',
    'Trezor Safe 7 (8S9)',
    'trezor safe7',
    'Trezor T3W1',
    'Trezor Safe 5',
    'Trezor',
    'Safe 7',
    'Speaker',
  ])('name rule agrees with the renderer patterns for %p', name => {
    const rendererMatch = (TREZOR_BLE_MATCH.namePatterns ?? []).every(pattern =>
      new RegExp(pattern, 'i').test(name)
    );
    expect(vendor.isName?.(name)).toBe(rendererMatch);
  });
});
