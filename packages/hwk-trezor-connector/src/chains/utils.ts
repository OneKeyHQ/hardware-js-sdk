import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';

import type { TrezorDeviceSession } from '@onekeyfe/hwk-trezor-core';

/**
 * Context handed to every chain handler. Keeps the surface area narrow
 * (handlers don't need the full TrezorSession) and stable so adding fields
 * later (signal, features, logger) doesn't require touching every chain.
 */
export type TrezorChainContext = {
  deviceSession: TrezorDeviceSession;
};

export function createInvalidParamsError(message: string): Error {
  return createHwkError({ code: HardwareErrorCode.InvalidParams, message });
}

export function createMethodNotSupportedError(message: string): Error {
  return createHwkError({ code: HardwareErrorCode.MethodNotSupported, message });
}

/**
 * Parse a BIP32 path string into the address_n number array Trezor
 * protobuf expects. Hardened components (apostrophe, h, H) get OR'd with
 * 0x80000000. 'm' is treated as the root, equivalent to an empty path.
 */
export function parseBip32Path(path: string): number[] {
  const normalized = path.trim();
  const parts = normalized.startsWith('m/')
    ? normalized.slice(2).split('/')
    : normalized === 'm'
    ? []
    : normalized.split('/');

  if (parts.length === 0 || parts.some(part => part.length === 0)) {
    throw createInvalidParamsError(`Invalid BIP32 path: ${path}`);
  }

  return parts.map(part => {
    const match = part.match(/^(\d+)(['hH]?)$/);
    if (!match) {
      throw createInvalidParamsError(`Invalid BIP32 path segment: ${part}`);
    }

    const index = Number(match[1]);
    if (!Number.isSafeInteger(index) || index < 0 || index > 0x7fffffff) {
      throw createInvalidParamsError(`BIP32 path segment out of range: ${part}`);
    }

    return match[2] ? index + 0x80000000 : index;
  });
}

/** Type-safe protobuf field reader for string fields. */
export function readString(value: Record<string, unknown>, key: string): string | undefined {
  const candidate = value[key];
  return typeof candidate === 'string' ? candidate : undefined;
}

/** Type-safe protobuf field reader for number fields. */
export function readNumber(value: Record<string, unknown>, key: string): number | undefined {
  const candidate = value[key];
  return typeof candidate === 'number' ? candidate : undefined;
}

/**
 * Normalize hex for Trezor protobuf `bytes`: strip `0x` and even-pad odd
 * nibbles (`Buffer.from('5','hex')` would drop the nibble → wrong number).
 * Recurses arrays/plain-objects; mirrors OneKey hd-core `formatAnyHex`.
 *
 * SAFETY: only for hex-only values — would corrupt plain text (paths, names)
 * and flatten ArrayBuffer. Scope per chain, never as a generic transport hook.
 */
export function formatAnyHex(value: unknown): unknown {
  if (typeof value === 'string') {
    let stripped = value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
    if (stripped.length % 2 !== 0) stripped = `0${stripped}`;
    return stripped;
  }
  if (Array.isArray(value)) {
    return value.map(item => formatAnyHex(item));
  }
  // Plain objects only — ArrayBuffer/typed arrays must not be flattened to `{}`.
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, formatAnyHex(val)]));
  }
  return value;
}
