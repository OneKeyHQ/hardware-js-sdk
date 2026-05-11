import {
  isLedgerBleConnectionType,
  isLedgerBleDescriptor,
  isLedgerDmkBleTransport,
  isValidLedgerBleConnectId,
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

  it('validates Ledger BLE connectId as exactly four hex characters', () => {
    expect(isValidLedgerBleConnectId('A58F')).toBe(true);
    expect(isValidLedgerBleConnectId('a58f')).toBe(true);
    expect(isValidLedgerBleConnectId('D5:75:7D:4B:51:E8')).toBe(false);
    expect(isValidLedgerBleConnectId('nano X123')).toBe(false);
    expect(isValidLedgerBleConnectId('')).toBe(false);
  });
});
