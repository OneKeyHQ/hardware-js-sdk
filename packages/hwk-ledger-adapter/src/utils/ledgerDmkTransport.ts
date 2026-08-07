import type { ConnectionType, DeviceDescriptor } from '@onekeyfe/hwk-adapter-core';

/**
 * Ledger DMK transport identifiers that represent BLE devices.
 *
 * Known today:
 * - "BLE": generic/web BLE descriptors
 * - "RN_BLE": @ledgerhq/device-transport-kit-react-native-ble
 *
 * Keep the suffix check here so future DMK BLE transports (for example
 * "FOO_BLE") are handled in one place instead of scattering string checks.
 */
export function isLedgerDmkBleTransport(transport?: string): boolean {
  const normalized = transport?.toUpperCase();
  return normalized === 'BLE' || normalized?.endsWith('_BLE') === true;
}

export function isLedgerBleConnectionType(connectionType?: ConnectionType): boolean {
  return connectionType === 'ble';
}

export function isLedgerBleDescriptor(
  connectionType: ConnectionType,
  descriptor: DeviceDescriptor
): boolean {
  return isLedgerBleConnectionType(connectionType) || isLedgerDmkBleTransport(descriptor.transport);
}
