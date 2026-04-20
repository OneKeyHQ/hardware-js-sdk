import { LedgerBleConnector } from './LedgerBleConnector';

import type { IConnector } from '@onekeyfe/hwk-adapter-core';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import type { LedgerBleConnectorOptions } from './LedgerBleConnector';

export { LedgerBleConnector };
export type { LedgerBleConnectorOptions };

/**
 * Create a LedgerBleConnector.
 *
 * @param dmk - Optional pre-built DMK instance. If omitted, the connector
 *              will lazily create one using `@ledgerhq/device-management-kit`
 *              and `@ledgerhq/device-transport-kit-react-native-ble`.
 */
export function createLedgerBleConnector(dmk?: DeviceManagementKit): IConnector {
  return new LedgerBleConnector({ dmk });
}
