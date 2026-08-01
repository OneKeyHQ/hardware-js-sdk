import {
  isLedgerBleConnectionType,
  isLedgerBleDescriptor,
  isLedgerDmkBleTransport,
} from '../utils/ledgerDmkTransport';

describe('ledgerDmkTransport', () => {
  it('recognizes current DMK BLE transport identifiers', () => {
    expect(isLedgerDmkBleTransport('BLE')).toBe(true);
    expect(isLedgerDmkBleTransport('RN_BLE')).toBe(true);
  });

  it('treats future DMK BLE suffix transports as BLE in one place', () => {
    expect(isLedgerDmkBleTransport('SOME_NEW_BLE')).toBe(true);
    expect(isLedgerDmkBleTransport('WEB-HID')).toBe(false);
    expect(isLedgerDmkBleTransport(undefined)).toBe(false);
  });

  it('uses connector connectionType as authoritative for BLE connectors', () => {
    expect(isLedgerBleConnectionType('ble')).toBe(true);
    expect(isLedgerBleConnectionType('usb')).toBe(false);
    expect(
      isLedgerBleDescriptor('ble', {
        path: 'D5:75:7D:4B:51:E8',
        transport: 'RN_BLE',
      })
    ).toBe(true);
  });
});
