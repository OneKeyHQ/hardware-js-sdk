import { TREZOR_BLE_PACKET_SIZE, TREZOR_BLE_UUIDS } from '@onekeyfe/hwk-trezor-adapter';

import type { ElectronBleConnectOptions, ElectronBleMatch } from '@onekeyfe/hwk-adapter-core';

/** Inter-chunk delay during write, matches OneKey's `UNIFIED_WRITE_DELAY`. */
export const TREZOR_BLE_WRITE_CHUNK_DELAY_MS = 5;

export const TREZOR_BLE_VENDOR = 'trezor';

/**
 * Trezor matcher sent to the vendor-agnostic main process. A name must match every
 * pattern, like `isTrezorSafe7BleName`: "Trezor" plus "Safe 7" or "T3W1".
 */
export const TREZOR_BLE_MATCH: ElectronBleMatch = {
  serviceUuids: [TREZOR_BLE_UUIDS.service],
  namePatterns: ['\\bTrezor\\b', '\\bSafe\\s*7\\b|\\bT3W1\\b'],
};

/**
 * Trezor firmware expects fixed-size packets: a short final packet is silently
 * dropped, so every write is padded to the full MTU.
 */
export const TREZOR_BLE_CONNECT_PROFILE: ElectronBleConnectOptions = {
  vendor: TREZOR_BLE_VENDOR,
  serviceUuid: TREZOR_BLE_UUIDS.service,
  writeUuid: TREZOR_BLE_UUIDS.write,
  notifyUuid: TREZOR_BLE_UUIDS.notify,
  write: {
    mode: 'padded',
    chunkSize: TREZOR_BLE_PACKET_SIZE,
    chunkDelayMs: TREZOR_BLE_WRITE_CHUNK_DELAY_MS,
  },
};
