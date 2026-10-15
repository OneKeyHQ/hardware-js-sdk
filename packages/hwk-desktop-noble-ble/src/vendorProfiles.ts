import type { ElectronBleConnectOptions } from '@onekeyfe/hwk-adapter-core';

/**
 * Main-process allowlist entry for one vendor key. The renderer only names the vendor; which
 * peripherals it may see and which GATT profile and framing it may use are decided here, so an
 * IPC caller cannot turn the service into a generic BLE proxy. UUID arguments may arrive in any
 * case, with or without dashes.
 */
export interface ThirdPartyBleVendorProfile {
  /** Whether an advertised service UUID belongs to this vendor. */
  isServiceUuid(uuid: string): boolean;
  /** Whether a local name belongs to this vendor; the handler passes a length-capped name. */
  isName?(name: string): boolean;
  /** Whether this GATT profile and write framing is one the vendor's firmware uses. */
  acceptsConnect(options: ElectronBleConnectOptions): boolean;
}

export const normalizeBleUuid = (uuid: string): string => uuid.replace(/-/g, '').toLowerCase();

const isUuidString = (value: unknown): value is string => typeof value === 'string';

const isIntegerInRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

// Duplicated from @onekeyfe/hwk-trezor-adapter (TREZOR_BLE_UUIDS, TREZOR_BLE_PACKET_SIZE) to keep
// this package free of vendor dependencies; the Trezor connector tests pin the two together.
const TREZOR_SERVICE_UUID = normalizeBleUuid('8c000001-a59b-4d58-a9ad-073df69fa1b1');
const TREZOR_WRITE_UUID = normalizeBleUuid('8c000002-a59b-4d58-a9ad-073df69fa1b1');
const TREZOR_NOTIFY_UUID = normalizeBleUuid('8c000003-a59b-4d58-a9ad-073df69fa1b1');
const TREZOR_PACKET_SIZE = 244;
const TREZOR_MAX_CHUNK_DELAY_MS = 50;
const TREZOR_NAME_BRAND = /\bTrezor\b/i;
const TREZOR_NAME_MODEL = /\bSafe\s*7\b|\bT3W1\b/i;

const trezorProfile: ThirdPartyBleVendorProfile = {
  isServiceUuid: uuid => isUuidString(uuid) && normalizeBleUuid(uuid) === TREZOR_SERVICE_UUID,
  isName: name => TREZOR_NAME_BRAND.test(name) && TREZOR_NAME_MODEL.test(name),
  acceptsConnect: options => {
    const { write } = options;
    return (
      isUuidString(options.serviceUuid) &&
      isUuidString(options.writeUuid) &&
      isUuidString(options.notifyUuid) &&
      normalizeBleUuid(options.serviceUuid) === TREZOR_SERVICE_UUID &&
      normalizeBleUuid(options.writeUuid) === TREZOR_WRITE_UUID &&
      normalizeBleUuid(options.notifyUuid) === TREZOR_NOTIFY_UUID &&
      typeof write === 'object' &&
      write !== null &&
      write.mode === 'padded' &&
      write.chunkSize === TREZOR_PACKET_SIZE &&
      (write.chunkDelayMs === undefined ||
        isIntegerInRange(write.chunkDelayMs, 0, TREZOR_MAX_CHUNK_DELAY_MS)) &&
      write.maxLength === undefined
    );
  },
};

// DMK's GATT family 13d63400-2c97-MMMM-000R-4c6564676572: MMMM is the model (0004 Nano X,
// 6004 Stax, 3004 Flex, 8004/9004 Nano Gen5), R the role. Any model segment is accepted so a
// new model works without a release here.
const LEDGER_UUID = /^13d634002c97([0-9a-f]{4})000([0-3])4c6564676572$/;
const LEDGER_ROLE_SERVICE = '0';
const LEDGER_ROLE_NOTIFY = '1';
const LEDGER_ROLE_WRITE = '2';
const LEDGER_ROLE_WRITE_CMD = '3';
// The 0x08 handshake reports the frame size in one byte.
const LEDGER_MAX_FRAME_SIZE = 255;

const parseLedgerUuid = (uuid: unknown): { model: string; role: string } | undefined => {
  if (!isUuidString(uuid)) return undefined;
  const parsed = LEDGER_UUID.exec(normalizeBleUuid(uuid));
  return parsed ? { model: parsed[1], role: parsed[2] } : undefined;
};

const ledgerProfile: ThirdPartyBleVendorProfile = {
  isServiceUuid: uuid => parseLedgerUuid(uuid)?.role === LEDGER_ROLE_SERVICE,
  acceptsConnect: options => {
    const service = parseLedgerUuid(options.serviceUuid);
    const notify = parseLedgerUuid(options.notifyUuid);
    const write = parseLedgerUuid(options.writeUuid);
    const framing = options.write;
    return (
      service?.role === LEDGER_ROLE_SERVICE &&
      notify?.role === LEDGER_ROLE_NOTIFY &&
      (write?.role === LEDGER_ROLE_WRITE || write?.role === LEDGER_ROLE_WRITE_CMD) &&
      notify.model === service.model &&
      write.model === service.model &&
      typeof framing === 'object' &&
      framing !== null &&
      framing.mode === 'raw' &&
      isIntegerInRange(framing.maxLength, 1, LEDGER_MAX_FRAME_SIZE) &&
      framing.chunkSize === undefined &&
      framing.chunkDelayMs === undefined
    );
  },
};

/**
 * Vendors the desktop BLE service serves by default, keyed by the vendor string the connectors
 * send. A host passing `vendors` replaces this map, so spread it to add a vendor.
 */
export const DEFAULT_THIRD_PARTY_BLE_VENDORS: Readonly<Record<string, ThirdPartyBleVendorProfile>> =
  Object.freeze({
    ledger: ledgerProfile,
    trezor: trezorProfile,
  });
