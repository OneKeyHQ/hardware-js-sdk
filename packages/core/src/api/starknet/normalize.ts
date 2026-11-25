import BigNumber from 'bignumber.js';

import { invalidParameter } from '../helpers/paramsValidator';
import { addHexPrefix, isHexString, stripHexPrefix } from '../helpers/hexUtils';

const FELT_BYTES = 32;
const U128_BYTES = 16;
const UINT64_MAX = new BigNumber(2).pow(64).minus(1);

// Device bytes fields take unprefixed hex. Values are left-padded to a fixed
// width so a zero felt still goes out as a byte instead of an empty field,
// which the device rejects.
const toFixedHex = (value: unknown, byteLength: number, name: string): string => {
  if (typeof value !== 'string' || !isHexString(addHexPrefix(value))) {
    throw invalidParameter(`${name} must be a hex string`);
  }
  const digits = stripHexPrefix(value);
  if (digits.length === 0) {
    throw invalidParameter(`${name} is empty`);
  }
  const significant = digits.replace(/^0+/, '');
  if (significant.length > byteLength * 2) {
    throw invalidParameter(`${name} exceeds ${byteLength} bytes`);
  }
  return significant.padStart(byteLength * 2, '0').toLowerCase();
};

export const toFeltHex = (value: unknown, name: string) => toFixedHex(value, FELT_BYTES, name);

export const toU128Hex = (value: unknown, name: string) => toFixedHex(value, U128_BYTES, name);

export const toFeltHexArray = (values: unknown, name: string): string[] => {
  if (values === undefined) {
    return [];
  }
  if (!Array.isArray(values)) {
    throw invalidParameter(`${name} must be an array`);
  }
  return values.map((value, index) => toFeltHex(value, `${name}[${index}]`));
};

// Accepts a safe integer, a decimal string or a 0x-prefixed hex string and
// returns a decimal string, so values above 2^53 survive protobuf encoding.
export const toUint64 = (value: unknown, name: string): string => {
  const isDecimal = typeof value === 'string' && /^\d+$/.test(value);
  const isHex = typeof value === 'string' && /^0x[0-9a-f]+$/i.test(value);
  const isSafeNumber = typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  if (!isDecimal && !isHex && !isSafeNumber) {
    throw invalidParameter(`${name} must be an unsigned integer`);
  }
  const parsed = new BigNumber(value);
  if (parsed.isGreaterThan(UINT64_MAX)) {
    throw invalidParameter(`${name} exceeds uint64`);
  }
  return parsed.toFixed(0);
};

// Numeric protobuf enum; undefined falls back to the device default.
export const toEnumValue = <T extends number>(
  value: unknown,
  enumObject: Record<string, string | number>,
  fallback: T,
  name: string
): T => {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'number' || !Object.values(enumObject).includes(value)) {
    throw invalidParameter(`Invalid ${name}`);
  }
  return value as T;
};

export const formatHexResult = (value: string | undefined) =>
  value ? addHexPrefix(value).toLowerCase() : '';
