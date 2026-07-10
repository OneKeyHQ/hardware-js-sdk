import {
  TREZOR_BLE_PACKET_SIZE,
  TREZOR_BLE_SUPPORTED_MODELS,
  TREZOR_BLE_UUIDS,
  TREZOR_SAFE_7_MODEL,
  isTrezorBleDescriptor,
  isTrezorBleSupportedModel,
  isTrezorSafe7BleName,
  resolveTrezorBleConnectId,
} from '../index';

describe('Trezor BLE base data', () => {
  it('exposes THP BLE constants from the public research spec', () => {
    expect(TREZOR_BLE_PACKET_SIZE).toBe(244);
    expect(TREZOR_BLE_UUIDS.service).toBe('8c000001-a59b-4d58-a9ad-073df69fa1b1');
    expect(TREZOR_BLE_UUIDS.write).toBe('8c000002-a59b-4d58-a9ad-073df69fa1b1');
    expect(TREZOR_BLE_UUIDS.notify).toBe('8c000003-a59b-4d58-a9ad-073df69fa1b1');
    expect(TREZOR_BLE_UUIDS.push).toBe('8c000004-a59b-4d58-a9ad-073df69fa1b1');
    expect(TREZOR_SAFE_7_MODEL).toBe('T3W1');
    expect(TREZOR_BLE_SUPPORTED_MODELS).toEqual(['T3W1']);
  });

  it('recognizes only Trezor models with BLE support', () => {
    expect(isTrezorBleSupportedModel('T3W1')).toBe(true);
    expect(isTrezorBleSupportedModel('Safe 7')).toBe(true);
    expect(isTrezorBleSupportedModel('Trezor Safe 7')).toBe(true);
    expect(isTrezorBleSupportedModel('Safe 5')).toBe(false);
    expect(isTrezorBleSupportedModel('T3T1')).toBe(false);
    expect(isTrezorBleSupportedModel(undefined)).toBe(false);
  });

  it('recognizes Safe 7 BLE advertising names only', () => {
    expect(isTrezorSafe7BleName('Trezor Safe 7')).toBe(true);
    expect(isTrezorSafe7BleName('Trezor T3W1')).toBe(true);
    expect(isTrezorSafe7BleName('Trezor Safe 5')).toBe(false);
    expect(isTrezorSafe7BleName(undefined)).toBe(false);
  });

  it('recognizes Trezor BLE descriptors by service UUID only', () => {
    expect(
      isTrezorBleDescriptor({
        id: 'safe-7',
        serviceUUIDs: [TREZOR_BLE_UUIDS.service],
      })
    ).toBe(true);
    expect(
      isTrezorBleDescriptor({
        id: 'safe-7',
        advertisedServiceUuids: [TREZOR_BLE_UUIDS.service.toUpperCase()],
      })
    ).toBe(true);
    expect(
      isTrezorBleDescriptor({
        id: 'safe-7',
        advertisedServiceUuids: [TREZOR_BLE_UUIDS.service.replace(/-/g, '')],
      })
    ).toBe(true);
    expect(
      isTrezorBleDescriptor({
        id: 'onekey',
        name: 'OneKey Pro 1234',
        serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
      })
    ).toBe(false);
    expect(isTrezorBleDescriptor({ id: 'safe-7', name: 'Trezor Safe 7' })).toBe(false);
    expect(isTrezorBleDescriptor({ id: 'safe-7', model: 'T3W1' })).toBe(false);
    expect(isTrezorBleDescriptor({ id: 'ledger', name: 'Ledger Nano X' })).toBe(false);
  });

  it('prefers explicit id fields for connectId and falls back to path', () => {
    expect(resolveTrezorBleConnectId({ id: 'device-id', path: 'path-id' })).toBe('device-id');
    expect(resolveTrezorBleConnectId({ path: 'path-id' })).toBe('path-id');
    expect(resolveTrezorBleConnectId({ name: 'Trezor Safe 7' })).toBe('Trezor Safe 7');
  });
});
