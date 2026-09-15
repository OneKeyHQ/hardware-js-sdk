import type { ElectronBleConnectOptions, ElectronBleMatch } from '@onekeyfe/hwk-adapter-core';

export const LEDGER_BLE_VENDOR = 'ledger';

/**
 * Frame size bounds for the 0x08 handshake, kept together because they are two
 * halves of one rule: the device reports the size it can take in a single
 * byte, so 255 is the most it can ask for, and 20 is the floor we raise a
 * smaller answer to. The negotiated value in between is used as-is — capping
 * it would negotiate and then discard the answer, leaving every transfer at
 * roughly 7x the frame count.
 */
export const LEDGER_BLE_MIN_FRAME_SIZE = 20;
export const LEDGER_BLE_MAX_FRAME_SIZE = 255;

/**
 * Ledger GATT uuids are per device model, so unlike Trezor's fixed profile
 * they are looked up from the DMK data source at discovery time and passed in
 * here. Only the vendor key and the framing rule are constant.
 */
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
