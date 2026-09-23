import { LedgerConnectorBase } from '@onekeyfe/hwk-ledger-adapter';
import { LedgerElectronBleTransport } from './LedgerElectronBleTransport';

import type { TransportArgs } from '@ledgerhq/device-management-kit';
import type { ElectronBleApi } from '@onekeyfe/hwk-adapter-core';

class LedgerElectronBleConnector extends LedgerConnectorBase {
  private readonly _transportRef: { current?: LedgerElectronBleTransport };

  constructor(bridge: ElectronBleApi) {
    const transportRef: { current?: LedgerElectronBleTransport } = {};
    super(
      async () => (args: TransportArgs) => {
        const transport = new LedgerElectronBleTransport(bridge, args);
        transportRef.current = transport;
        return transport;
      },
      { connectionType: 'ble' }
    );
    this._transportRef = transportRef;
  }

  override async cancel(sessionId: string): Promise<void> {
    await super.cancel(sessionId);
    // Base cancel only settles DeviceAction cancellers; a connect stuck in the
    // main process must be abandoned there.
    try {
      await this._transportRef.current?.cancelPairing(sessionId);
    } catch {
      // Cancel must never throw.
    }
  }
}

export function createLedgerElectronBleConnector(bridge: ElectronBleApi): LedgerConnectorBase {
  return new LedgerElectronBleConnector(bridge);
}
