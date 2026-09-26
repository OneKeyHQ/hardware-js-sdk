export { NobleBleHandler } from './NobleBleHandler';
export type { NobleBleHandlerOptions } from './NobleBleHandler';

export { initThirdPartyBleSupport } from './main';
export type {
  InitThirdPartyBleSupportOptions,
  IpcMainLike,
  ThirdPartyBleSupportHandle,
} from './main';

export {
  THIRD_PARTY_BLE_CHANNELS,
  THIRD_PARTY_BLE_SCAN_DURATION_MS,
  THIRD_PARTY_BLE_SCAN_IDLE_STOP_MS,
  THIRD_PARTY_BLE_DEVICE_TTL_MS,
  THIRD_PARTY_BLE_POWER_ON_TIMEOUT_MS,
} from './constants';
export type { ThirdPartyBleChannel } from './constants';

export type {
  ThirdPartyBleApi,
  ThirdPartyBleAvailability,
  ThirdPartyBleDeviceInfo,
} from './types/desktop-api';

export type { BleDebugLogEntry, BleDebugLogLevel, BleDebugLogger } from './debugLog';
export { redactBleDebugLogData } from './debugLog';
