import { Buffer } from 'buffer';

/**
 * EIP-712 helpers for Trezor's full-mode typed-data signing.
 *
 * Mirrors 1K's packages/core/src/api/helpers/typeNameUtils.ts, retargeted
 * at Trezor's protobuf types. Three responsibilities:
 *
 *   - parseArrayType:  split "Foo[]" / "uint256[3]" into entry + size.
 *   - getFieldType:    map an EIP-712 typename onto Trezor's EthereumFieldType.
 *   - encodeData:      encode an atomic value (string/uint/int/bytes/address/bool)
 *                      to the hex string Trezor's EthereumTypedDataValueAck.value expects.
 */

// Matches Trezor's EthereumDataType enum from messages-ethereum-eip712.proto.
export const EthereumDataType = {
  UINT: 1,
  INT: 2,
  BYTES: 3,
  STRING: 4,
  BOOL: 5,
  ADDRESS: 6,
  ARRAY: 7,
  STRUCT: 8,
} as const;

export type EthereumFieldType = {
  data_type: number;
  size?: number;
  entry_type?: EthereumFieldType;
  struct_name?: string;
};

export type EthereumSignTypedDataTypes = Record<string, Array<{ name: string; type: string }>>;

const paramTypeArray = /^(.*)\[([0-9]*)\]$/;
const paramTypeBytes = /^bytes([0-9]*)$/;
const paramTypeNumber = /^(u?int)([0-9]*)$/;

const simpleTypesMap: Record<string, number> = {
  string: EthereumDataType.STRING,
  bool: EthereumDataType.BOOL,
  address: EthereumDataType.ADDRESS,
};

export function parseArrayType(arrayTypeName: string): {
  entryTypeName: string;
  arraySize: number | null;
} {
  const match = paramTypeArray.exec(arrayTypeName);
  if (!match) {
    throw new Error(`Type ${arrayTypeName} is not an EIP-712 array`);
  }
  const [, entryTypeName, arraySize] = match;
  return {
    entryTypeName,
    arraySize: parseInt(arraySize, 10) || null,
  };
}

export function getFieldType(
  typeName: string,
  types: EthereumSignTypedDataTypes
): EthereumFieldType {
  const arrayMatch = paramTypeArray.exec(typeName);
  if (arrayMatch) {
    const [, entryTypeName, arraySize] = arrayMatch;
    return {
      data_type: EthereumDataType.ARRAY,
      size: parseInt(arraySize, 10) || undefined,
      entry_type: getFieldType(entryTypeName, types),
    };
  }
  const numberMatch = paramTypeNumber.exec(typeName);
  if (numberMatch) {
    const [, intType, bits] = numberMatch;
    return {
      data_type: intType === 'uint' ? EthereumDataType.UINT : EthereumDataType.INT,
      size: Math.floor(parseInt(bits, 10) / 8),
    };
  }
  const bytesMatch = paramTypeBytes.exec(typeName);
  if (bytesMatch) {
    const [, size] = bytesMatch;
    return {
      data_type: EthereumDataType.BYTES,
      size: parseInt(size, 10) || undefined,
    };
  }
  const simple = simpleTypesMap[typeName];
  if (simple !== undefined) {
    return { data_type: simple };
  }
  if (typeName in types) {
    return {
      data_type: EthereumDataType.STRUCT,
      size: types[typeName].length,
      struct_name: typeName,
    };
  }
  throw new Error(`EIP-712: type "${typeName}" is not defined`);
}

/**
 * Encode an atomic value (no structs, no arrays) per EIP-712 wire rules
 * into the hex string Trezor expects in TypedDataValueAck.value.
 */
export function encodeData(typeName: string, value: unknown): string {
  if (paramTypeBytes.test(typeName) || typeName === 'address') {
    if (typeof value !== 'string') {
      throw new Error(`EIP-712 encodeData ${typeName}: expected hex string`);
    }
    return formatHex(value);
  }
  if (typeName === 'string') {
    if (typeof value !== 'string') {
      throw new Error('EIP-712 encodeData string: expected string value');
    }
    return Buffer.from(value, 'utf-8').toString('hex');
  }
  const numberMatch = paramTypeNumber.exec(typeName);
  if (numberMatch) {
    const [, intType, bits] = numberMatch;
    const bytes = Math.ceil(parseInt(bits, 10) / 8);
    return intToHex(value, bytes, intType === 'int');
  }
  if (typeName === 'bool') {
    return value ? '01' : '00';
  }
  throw new Error(`EIP-712 encodeData: unsupported atomic type "${typeName}"`);
}

function formatHex(value: string): string {
  let v = value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
  if (v.length % 2 !== 0) v = `0${v}`;
  return v;
}

/**
 * Convert a numeric value to a fixed-width big-endian hex string.
 * Accepts number, bigint, decimal string, or 0x-prefixed hex string.
 * Two's-complement encoding for negative signed values.
 */
export function intToHex(value: unknown, bytes: number, signed: boolean): string {
  let bn: bigint;
  if (typeof value === 'bigint') {
    bn = value;
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`EIP-712 intToHex: invalid number ${value}`);
    bn = BigInt(Math.trunc(value));
  } else if (typeof value === 'boolean') {
    bn = BigInt(value ? 1 : 0);
  } else if (typeof value === 'string') {
    bn = BigInt(value);
  } else {
    throw new Error(`EIP-712 intToHex: cannot encode value of type ${typeof value}`);
  }

  const range = 1n << BigInt(bytes * 8);
  if (signed) {
    // int range is [-2^(n-1), 2^(n-1)). Validate BEFORE two's-complement
    // wrap so out-of-range negatives don't silently become valid positives
    // (e.g. -129 for int8 would otherwise wrap to 127 = 0x7f).
    const halfRange = range >> 1n;
    if (bn < -halfRange || bn >= halfRange) {
      throw new Error(`EIP-712 intToHex: value out of range for ${bytes * 8}-bit int`);
    }
    if (bn < 0n) {
      bn = range + bn;
    }
  } else if (bn < 0n || bn >= range) {
    throw new Error(`EIP-712 intToHex: value out of range for ${bytes * 8}-bit uint`);
  }
  return bn.toString(16).padStart(bytes * 2, '0');
}
