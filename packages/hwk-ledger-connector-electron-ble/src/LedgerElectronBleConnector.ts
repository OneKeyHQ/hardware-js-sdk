import { LedgerConnectorBase } from '@onekeyfe/hwk-ledger-adapter';
import { LedgerElectronBleTransport } from './LedgerElectronBleTransport';

import type { TransportArgs } from '@ledgerhq/device-management-kit';
import type { ElectronBleApi } from '@onekeyfe/hwk-adapter-core';

export function createLedgerElectronBleConnector(bridge: ElectronBleApi): LedgerConnectorBase {
  return new LedgerConnectorBase(
    async () => (args: TransportArgs) => new LedgerElectronBleTransport(bridge, args),
    { connectionType: 'ble' }
  );
}
