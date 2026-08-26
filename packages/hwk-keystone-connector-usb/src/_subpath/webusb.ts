import { TransportWebUSB } from '@keystonehq/hw-transport-webusb';

import { KeystoneUsbConnectorBase } from '../KeystoneUsbConnectorBase';

import type { IConnector } from '@onekeyfe/hwk-adapter-core';

export function createKeystoneWebUsbConnector(options?: { timeoutMs?: number }): IConnector {
  return new KeystoneUsbConnectorBase(TransportWebUSB, options);
}

/**
 * Triggers the browser's WebUSB device picker. Must be called from a
 * user-gesture handler (e.g. directly inside a button's `onclick`) — same
 * requirement as any other WebUSB permission request.
 */
export async function requestKeystoneUsbPermission(): Promise<void> {
  await TransportWebUSB.requestPermission();
}
