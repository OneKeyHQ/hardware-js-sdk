import type { IConnector } from '@onekeyfe/hwk-adapter-core';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';

import { LedgerWebHidConnector } from './LedgerWebHidConnector';
import type { LedgerWebHidConnectorOptions } from './LedgerWebHidConnector';

export { LedgerWebHidConnector };
export type { LedgerWebHidConnectorOptions };

/**
 * Create a LedgerWebHidConnector.
 *
 * @param dmk - Optional pre-built DMK instance. If omitted, the connector
 *              will lazily create one using `@ledgerhq/device-management-kit`
 *              and `@ledgerhq/device-transport-kit-web-hid`.
 */
export function createLedgerWebHidConnector(dmk?: DeviceManagementKit): IConnector {
  return new LedgerWebHidConnector({ dmk });
}
