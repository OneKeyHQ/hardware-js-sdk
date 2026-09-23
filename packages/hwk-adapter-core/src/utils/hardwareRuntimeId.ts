import { bytesToHex, randomBytes } from '@noble/hashes/utils';

import type { VendorType } from '../types/device';

export const HARDWARE_RUNTIME_ID_PREFIX = 'hwk:runtime';

const RANDOM_ID_BYTES = 16;
const RANDOM_ID_PATTERN = /^[0-9a-f]{32}$/;

/**
 * `search-target`: one device in one discovery snapshot, dead on the next search of that kind.
 * `link`: one open transport. `operation`: one business operation, outliving links via `rebind()`.
 */
export type HardwareRuntimeIdKind = 'operation' | 'search-target' | 'link';

export type HardwareRuntimeId = {
  kind: HardwareRuntimeIdKind;
  vendor: VendorType;
};

const KINDS: ReadonlySet<string> = new Set<HardwareRuntimeIdKind>([
  'operation',
  'search-target',
  'link',
]);
const VENDORS: ReadonlySet<string> = new Set<VendorType>(['trezor', 'ledger', 'keystone']);

function create(kind: HardwareRuntimeIdKind, vendor: VendorType): string {
  return `${HARDWARE_RUNTIME_ID_PREFIX}:${kind}:${vendor}:${bytesToHex(
    randomBytes(RANDOM_ID_BYTES)
  )}`;
}

/** Runtime ids are opaque and must never be persisted as device identity. */
export function createHardwareOperationId(vendor: VendorType): string {
  return create('operation', vendor);
}

/** Search targets are valid only for the adapter's current discovery snapshot. */
export function createHardwareSearchTargetId(vendor: VendorType): string {
  return create('search-target', vendor);
}

export function createHardwareLinkId(vendor: VendorType): string {
  return create('link', vendor);
}

export function hasHardwareRuntimeIdPrefix(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(`${HARDWARE_RUNTIME_ID_PREFIX}:`);
}

export function parseHardwareRuntimeId(value: unknown): HardwareRuntimeId | undefined {
  if (!hasHardwareRuntimeIdPrefix(value)) return undefined;
  const parts = value.split(':');
  if (parts.length !== 5) return undefined;
  const [, , kind, vendor, nonce] = parts;
  if (!KINDS.has(kind) || !VENDORS.has(vendor) || !RANDOM_ID_PATTERN.test(nonce)) {
    return undefined;
  }
  return { kind: kind as HardwareRuntimeIdKind, vendor: vendor as VendorType };
}

export function isHardwareOperationId(value: unknown): value is string {
  return parseHardwareRuntimeId(value)?.kind === 'operation';
}
