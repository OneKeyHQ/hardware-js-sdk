import { LedgerConnectorBase, extractBleHexId } from '@onekeyfe/hwk-ledger-adapter';

import type { DeviceDescriptor } from '@onekeyfe/hwk-adapter-core';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';

export interface LedgerBleConnectorOptions {
  dmk?: DeviceManagementKit;
}

export class LedgerBleConnector extends LedgerConnectorBase {
  constructor(options?: LedgerBleConnectorOptions) {
    super(
      async () => {
        const { RNBleTransportFactory } = await import(
          '@ledgerhq/device-transport-kit-react-native-ble'
        );
        return RNBleTransportFactory;
      },
      { connectionType: 'ble', dmk: options?.dmk }
    );
  }

  protected override _resolveConnectId(descriptor: DeviceDescriptor): string {
    return extractBleHexId(descriptor.name) || descriptor.path;
  }
}
