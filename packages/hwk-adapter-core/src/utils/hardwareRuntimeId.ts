import { bytesToHex, randomBytes } from '@noble/hashes/utils';

import type { VendorType } from '../types/device';

export const HARDWARE_RUNTIME_ID_PREFIX = 'hwk:runtime';

const RANDOM_ID_BYTES = 16;
const RANDOM_ID_PATTERN = /^[0-9a-f]{32}$/;

/**
 * Scopes a runtime id can name. Each is a different lifetime, and none of them
 * nests cleanly inside another:
 *
 * - `search-target` — one device in one discovery snapshot. Dies on the next
 *   search of the same kind, so a stale pick is refused rather than silently
 *   resolved against a different unit.
 * - `link` — one open transport. Outlives the snapshot that produced it.
 * - `operation` — one business operation. Outlives the link: `rebind()` swaps
 *   the transport underneath while the id stays the same.
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
