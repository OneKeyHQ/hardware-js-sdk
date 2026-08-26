import { TransportNodeUSB } from '@keystonehq/hw-transport-nodeusb';

import { KeystoneUsbConnectorBase } from '../KeystoneUsbConnectorBase';

import type { IConnector } from '@onekeyfe/hwk-adapter-core';

export function createKeystoneNodeUsbConnector(options?: { timeoutMs?: number }): IConnector {
  return new KeystoneUsbConnectorBase(TransportNodeUSB, options);
}
