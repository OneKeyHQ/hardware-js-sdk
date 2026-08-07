import { TrezorRnBleConnector } from './TrezorRnBleConnector';

import type { TrezorRnBleConnectorOptions } from './TrezorRnBleConnector';

export { TrezorRnBleConnector };
export { RNBlePlxTrezorTransport, createRNBlePlxTrezorTransport } from './RNBlePlxTrezorTransport';
export type { RNBlePlxTrezorTransportOptions } from './RNBlePlxTrezorTransport';
export type { TrezorRnBleConnectorOptions };

export function createTrezorRnBleConnector(
  options?: TrezorRnBleConnectorOptions
): TrezorRnBleConnector {
  return new TrezorRnBleConnector(options);
}
