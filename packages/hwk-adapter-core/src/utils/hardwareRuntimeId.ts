import { bytesToHex, randomBytes } from '@noble/hashes/utils';

import type { ConnectionType, VendorType } from '../types/device';

export const HARDWARE_RUNTIME_ID_PREFIX = 'hwk:runtime:v1';

const RANDOM_ID_BYTES = 16;
const RANDOM_ID_PATTERN = /^[0-9a-f]{32}$/;

export type HardwareRuntimeId =
  | {
      kind: 'interaction';
      vendor: VendorType;
      nonce: string;
    }
  | {
      kind: 'search-target';
      vendor: VendorType;
      connectionType: ConnectionType;
      nonce: string;
    }
  | {
      kind: 'connector-session';
      vendor: VendorType;
      connectionType: ConnectionType;
      nonce: string;
    };

const VENDORS: ReadonlySet<string> = new Set<VendorType>(['trezor', 'ledger', 'keystone']);
const CONNECTION_TYPES: ReadonlySet<string> = new Set<ConnectionType>(['usb', 'ble', 'qr']);

function createNonce(): string {
  return bytesToHex(randomBytes(RANDOM_ID_BYTES));
}

/** Runtime ids are opaque and must never be persisted as device identity. */
export function createHardwareInteractionId(vendor: VendorType): string {
  return `${HARDWARE_RUNTIME_ID_PREFIX}:interaction:${vendor}:${createNonce()}`;
}

/** Search targets are valid only for the adapter's current discovery snapshot. */
export function createHardwareSearchTargetId(params: {
  vendor: VendorType;
  connectionType: ConnectionType;
}): string {
  return `${HARDWARE_RUNTIME_ID_PREFIX}:search-target:${params.vendor}:${
    params.connectionType
  }:${createNonce()}`;
}

export function createHardwareConnectorSessionId(params: {
  vendor: VendorType;
  connectionType: ConnectionType;
}): string {
  return `${HARDWARE_RUNTIME_ID_PREFIX}:connector-session:${params.vendor}:${
    params.connectionType
  }:${createNonce()}`;
}

export function hasHardwareRuntimeIdPrefix(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(`${HARDWARE_RUNTIME_ID_PREFIX}:`);
}

export function parseHardwareRuntimeId(value: unknown): HardwareRuntimeId | undefined {
  if (!hasHardwareRuntimeIdPrefix(value)) return undefined;

  const parts = value.split(':');
  const kind = parts[3];
  const vendor = parts[4];
  if (!VENDORS.has(vendor)) return undefined;

  if (kind === 'interaction' && parts.length === 6 && RANDOM_ID_PATTERN.test(parts[5])) {
    return {
      kind,
      vendor: vendor as VendorType,
      nonce: parts[5],
    };
  }

  const connectionType = parts[5];
  if (
    (kind === 'search-target' || kind === 'connector-session') &&
    parts.length === 7 &&
    CONNECTION_TYPES.has(connectionType) &&
    RANDOM_ID_PATTERN.test(parts[6])
  ) {
    return {
      kind,
      vendor: vendor as VendorType,
      connectionType: connectionType as ConnectionType,
      nonce: parts[6],
    };
  }

  return undefined;
}

export function isHardwareInteractionId(value: unknown): value is string {
  return parseHardwareRuntimeId(value)?.kind === 'interaction';
}

export function isHardwareSearchTargetId(value: unknown): value is string {
  return parseHardwareRuntimeId(value)?.kind === 'search-target';
}
