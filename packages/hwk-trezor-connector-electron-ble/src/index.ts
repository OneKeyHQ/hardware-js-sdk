export {
  TrezorElectronBleConnector,
  createTrezorElectronBleConnector,
} from './TrezorElectronBleConnector';
export type { TrezorElectronBleConnectorOptions } from './TrezorElectronBleConnector';

export {
  TrezorElectronBleTransport,
  createTrezorElectronBleTransport,
} from './TrezorElectronBleTransport';
export type { TrezorElectronBleTransportOptions } from './TrezorElectronBleTransport';

export {
  TREZOR_BLE_CHANNELS,
  TREZOR_BLE_SCAN_DURATION_MS,
  TREZOR_BLE_POWER_ON_TIMEOUT_MS,
  TREZOR_BLE_WRITE_CHUNK_DELAY_MS,
} from './constants';
export type { TrezorBleChannel } from './constants';

export type { TrezorBleApi, TrezorBleAvailability, TrezorBleDeviceInfo } from './types/desktop-api';
