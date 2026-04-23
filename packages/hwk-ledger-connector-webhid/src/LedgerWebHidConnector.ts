import { LedgerConnectorBase, extractBleHexId } from '@onekeyfe/hwk-ledger-adapter';

import type { DeviceDescriptor } from '@onekeyfe/hwk-adapter-core';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';

export interface LedgerWebHidConnectorOptions {
  /**
   * Pre-built DMK instance. If not provided, a DMK will be created
   * lazily on first use via `@ledgerhq/device-management-kit` and
   * `@ledgerhq/device-transport-kit-web-hid`.
   */
  dmk?: DeviceManagementKit;
}

/**
 * IConnector implementation for Ledger hardware wallets via WebHID.
 *
 * Extends LedgerConnectorBase with the WebHID transport factory.
 * Overrides connectId resolution to handle BLE devices that may appear
 * via a WebHID+BLE combo transport.
 */
export class LedgerWebHidConnector extends LedgerConnectorBase {
  constructor(options?: LedgerWebHidConnectorOptions) {
    super(
      async () => {
        const { webHidTransportFactory } = await import('@ledgerhq/device-transport-kit-web-hid');
        return webHidTransportFactory;
      },
      { connectionType: 'usb', dmk: options?.dmk }
    );
  }

  /**
   * Override connectId resolution for BLE devices discovered via WebHID+BLE combo.
   * For USB devices, the DMK path (ephemeral UUID) is used as-is.
   */
  protected override _resolveConnectId(descriptor: DeviceDescriptor): string {
    if (descriptor.transport === 'BLE') {
      return extractBleHexId(descriptor.name) || descriptor.path;
    }
    return descriptor.path;
  }
}
