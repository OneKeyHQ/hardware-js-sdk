import type { ElectronBleConnectOptions, ElectronBleMatch } from '@onekeyfe/hwk-adapter-core';

export const LEDGER_BLE_VENDOR = 'ledger';

/**
 * 0x08 handshake frame bounds: the device answers in one byte (255 ceiling) and 20
 * is the floor. Values between are used as-is; capping would ~7x the frame count.
 */
export const LEDGER_BLE_MIN_FRAME_SIZE = 20;
export const LEDGER_BLE_MAX_FRAME_SIZE = 255;

/** Ledger GATT uuids are per model, so callers pass them in from DMK's data source. */
export function ledgerBleMatch(serviceUuids: string[]): ElectronBleMatch {
  return { serviceUuids };
}

export function ledgerBleConnectProfile(gatt: {
  serviceUuid: string;
  writeUuid: string;
  notifyUuid: string;
}): ElectronBleConnectOptions {
  return {
    vendor: LEDGER_BLE_VENDOR,
    ...gatt,
    // Ledger frames carry their own length and sequence; padding corrupts them.
    write: { mode: 'raw', maxLength: LEDGER_BLE_MAX_FRAME_SIZE },
  };
}
