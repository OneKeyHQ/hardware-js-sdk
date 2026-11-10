import { StaticDeviceModelDataSource } from '@ledgerhq/device-management-kit';
import { DEFAULT_THIRD_PARTY_BLE_VENDORS } from '@onekeyfe/hwk-desktop-noble-ble';

import { LEDGER_BLE_VENDOR, ledgerBleConnectProfile, ledgerBleMatch } from '../bleProfile';

// The desktop main process serves only allowlisted GATT profiles, so every model DMK knows must
// pass its Ledger profile exactly as LedgerElectronBleTransport builds the connect call.
describe('Ledger BLE profile against the desktop vendor allowlist', () => {
  const vendor = DEFAULT_THIRD_PARTY_BLE_VENDORS[LEDGER_BLE_VENDOR];
  const dataSource = new StaticDeviceModelDataSource();
  const infos = Object.values(dataSource.getBluetoothServicesInfos());

  test('DMK lists the known BLE models', () => {
    expect(infos.map(info => info.serviceUuid).sort()).toEqual(
      ['0004', '3004', '6004', '8004', '9004'].map(
        model => `13d63400-2c97-${model}-0000-4c6564676572`
      )
    );
  });

  test.each(infos.map(info => [info.deviceModel.id, info.serviceUuid, info] as const))(
    '%s (%s) connect profile is accepted',
    (_, __, info) => {
      const profile = ledgerBleConnectProfile({
        serviceUuid: info.serviceUuid,
        writeUuid: info.writeUuid,
        notifyUuid: info.notifyUuid,
      });
      expect(vendor.acceptsConnect(profile)).toBe(true);
      expect(vendor.acceptsConnect({ ...profile, writeUuid: info.writeCmdUuid })).toBe(true);
    }
  );

  test('every scanned service uuid belongs to the vendor', () => {
    const match = ledgerBleMatch(dataSource.getBluetoothServices());
    expect(match.serviceUuids?.length).toBeGreaterThan(0);
    for (const uuid of match.serviceUuids ?? []) expect(vendor.isServiceUuid(uuid)).toBe(true);
  });
});
