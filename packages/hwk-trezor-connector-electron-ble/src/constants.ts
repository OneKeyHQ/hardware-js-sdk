/**
 * IPC channel names exchanged between renderer and main process.
 * Namespaced under `$onekey-trezor-ble-…` to avoid clashing with the
 * existing OneKey BLE handler (`$onekey-noble-ble-…`) when both run in
 * the same Electron app.
 */
export const TREZOR_BLE_CHANNELS = {
  scan: '$onekey-trezor-ble-scan',
  stopScan: '$onekey-trezor-ble-stop-scan',
  connect: '$onekey-trezor-ble-connect',
  disconnect: '$onekey-trezor-ble-disconnect',
  write: '$onekey-trezor-ble-write',
  subscribe: '$onekey-trezor-ble-subscribe',
  unsubscribe: '$onekey-trezor-ble-unsubscribe',
  availability: '$onekey-trezor-ble-availability',
  getDevice: '$onekey-trezor-ble-get-device',
  readRssi: '$onekey-trezor-ble-read-rssi',
  cancelPairing: '$onekey-trezor-ble-cancel-pairing',
  /** push event: main → renderer with assembled BLE notification payload */
  notification: '$onekey-trezor-ble-notification',
  /** push event: main → renderer when device disconnects unexpectedly */
  disconnected: '$onekey-trezor-ble-disconnected',
} as const;

export type TrezorBleChannel = (typeof TREZOR_BLE_CHANNELS)[keyof typeof TREZOR_BLE_CHANNELS];

/** Reconnect scan window for `connect(id)`. */
export const TREZOR_BLE_SCAN_DURATION_MS = 5_000;

/** Continuous scan auto-stops this long after the last poll (reset, not accumulated). */
export const TREZOR_BLE_SCAN_IDLE_STOP_MS = 10_000;

/** Drop a device from the snapshot if it hasn't re-advertised within this window. */
export const TREZOR_BLE_DEVICE_TTL_MS = 5_000;

/** Time we'll wait for noble to reach `poweredOn` before failing init. */
export const TREZOR_BLE_POWER_ON_TIMEOUT_MS = 10_000;

/** Inter-chunk delay during write, matches OneKey's `UNIFIED_WRITE_DELAY`. */
export const TREZOR_BLE_WRITE_CHUNK_DELAY_MS = 5;
