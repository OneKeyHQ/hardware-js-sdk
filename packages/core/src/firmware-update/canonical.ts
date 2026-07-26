import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

const encodeUnicodeEscape = (codeUnit: number) => `\\u${codeUnit.toString(16).padStart(4, '0')}`;

const encodeString = (value: string) => {
  let encoded = '"';
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit === 0x22) {
      encoded += '\\"';
    } else if (codeUnit === 0x5c) {
      encoded += '\\\\';
    } else if (codeUnit === 0x08) {
      encoded += '\\b';
    } else if (codeUnit === 0x09) {
      encoded += '\\t';
    } else if (codeUnit === 0x0a) {
      encoded += '\\n';
    } else if (codeUnit === 0x0c) {
      encoded += '\\f';
    } else if (codeUnit === 0x0d) {
      encoded += '\\r';
    } else if (codeUnit <= 0x1f || codeUnit === 0x2028 || codeUnit === 0x2029) {
      encoded += encodeUnicodeEscape(codeUnit);
    } else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        encoded += value[index];
        encoded += value[index + 1];
        index += 1;
      } else {
        encoded += encodeUnicodeEscape(codeUnit);
      }
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      encoded += encodeUnicodeEscape(codeUnit);
    } else {
      encoded += value[index];
    }
  }
  return `${encoded}"`;
};

const isPlainRecord = (value: object): value is Record<string, unknown> => {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const canonicalize = (value: unknown, seen: Set<object>): string => {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'string') {
    return encodeString(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical firmware JSON accepts only finite numbers');
    }
    return Object.is(value, -0) ? '0' : String(value);
  }
  if (typeof value !== 'object') {
    throw new TypeError(`Canonical firmware JSON does not support ${typeof value}`);
  }
  if (seen.has(value)) {
    throw new TypeError('Canonical firmware JSON does not support cycles');
  }

  seen.add(value);
  let encoded: string;
  if (Array.isArray(value)) {
    encoded = `[${value.map(item => canonicalize(item, seen)).join(',')}]`;
  } else {
    if (!isPlainRecord(value)) {
      throw new TypeError('Canonical firmware JSON accepts only plain objects');
    }
    const entries = Object.keys(value)
      .sort()
      .map(key => `${encodeString(key)}:${canonicalize(value[key], seen)}`);
    encoded = `{${entries.join(',')}}`;
  }
  seen.delete(value);
  return encoded;
};

export const canonicalizeFirmwareJson = (value: unknown): string => canonicalize(value, new Set());

export const canonicalFirmwareJsonBytes = (value: unknown): Uint8Array =>
  new TextEncoder().encode(canonicalizeFirmwareJson(value));

export const sha256CanonicalFirmwareJson = (value: unknown): string =>
  bytesToHex(sha256(canonicalFirmwareJsonBytes(value)));

export const deepFreezeFirmwareValue = <T>(value: T, seen = new Set<object>()): T => {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  if (seen.has(value)) {
    throw new TypeError('Firmware values must not contain cycles');
  }
  seen.add(value);
  Object.values(value).forEach(item => deepFreezeFirmwareValue(item, seen));
  seen.delete(value);
  return Object.freeze(value);
};
