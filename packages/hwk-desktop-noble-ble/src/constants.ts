/**
 * Renderer/main IPC channels shared by every third-party BLE vendor; prefixed to
 * avoid clashing with the OneKey handler (`$onekey-noble-ble-*`) in one app.
 */
export const THIRD_PARTY_BLE_CHANNELS = {
  scan: '$onekey-3p-ble-scan',
  stopScan: '$onekey-3p-ble-stop-scan',
  connect: '$onekey-3p-ble-connect',
  disconnect: '$onekey-3p-ble-disconnect',
  write: '$onekey-3p-ble-write',
  subscribe: '$onekey-3p-ble-subscribe',
  unsubscribe: '$onekey-3p-ble-unsubscribe',
  availability: '$onekey-3p-ble-availability',
  getDevice: '$onekey-3p-ble-get-device',
  readRssi: '$onekey-3p-ble-read-rssi',
  cancelPairing: '$onekey-3p-ble-cancel-pairing',
  /** push event: main → renderer with assembled BLE notification payload */
  notification: '$onekey-3p-ble-notification',
  /** push event: main → renderer when device disconnects unexpectedly */
  disconnected: '$onekey-3p-ble-disconnected',
} as const;

export type ThirdPartyBleChannel =
  (typeof THIRD_PARTY_BLE_CHANNELS)[keyof typeof THIRD_PARTY_BLE_CHANNELS];

/** Reconnect scan window for `connect(id)`. */
export const THIRD_PARTY_BLE_SCAN_DURATION_MS = 5_000;

/** Continuous scan auto-stops this long after the last poll (reset, not accumulated). */
export const THIRD_PARTY_BLE_SCAN_IDLE_STOP_MS = 10_000;

/** Drop a device from the snapshot if it hasn't re-advertised within this window. */
export const THIRD_PARTY_BLE_DEVICE_TTL_MS = 5_000;

/** Time we'll wait for noble to reach `poweredOn` before failing init. */
export const THIRD_PARTY_BLE_POWER_ON_TIMEOUT_MS = 10_000;
