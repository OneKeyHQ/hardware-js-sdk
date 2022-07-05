/* eslint-disable prefer-regex-literals */

import { EthereumDataType, EthereumFieldType } from '@onekeyfe/hd-transport/src/types/messages';

import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { EthereumSignTypedDataTypes } from '../../types/api/evmSignTypedData';
import { intToHex } from './bigNumberUtils';
import { formatAnyHex } from './hexUtils';

// Copied from https://github.com/ethers-io/ethers.js/blob/v5.5.2/packages/abi/src.ts/fragments.ts#L249
const paramTypeArray = new RegExp(/^(.*)\[([0-9]*)\]$/);
const paramTypeBytes = new RegExp(/^bytes([0-9]*)$/);
const paramTypeNumber = new RegExp(/^(u?int)([0-9]*)$/);

/**
 * Parse the given EIP-712 array type into its entries, and its length (if not dynamic)
 * E.g. `uint16[32]` will return `{entryTypeName: 'uint16', arraySize: 32}`.
 */
export const parseArrayType = (
  arrayTypeName: string
): {
  entryTypeName: string;
  arraySize: number | null;
} => {
  const arrayMatch = paramTypeArray.exec(arrayTypeName);
  if (arrayMatch === null) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `typename ${arrayTypeName} could not be parsed as an EIP-712 array`
    );
  }
  const [_, entryTypeName, arraySize] = arrayMatch;
  return {
    entryTypeName,
    arraySize: parseInt(arraySize, 10) || null,
  };
};

/**
 * Encodes the given primitive data to a big-endian hex string.
 *
 * @param typeName - Primitive Solidity data type (e.g. `uint16`)
 * @param data - The actual data to convert.
 * @returns Hex string of the data.
 */
export const encodeData = (typeName: string, data: any): string => {
  if (paramTypeBytes.test(typeName) || typeName === 'address') {
    return formatAnyHex(data);
  }
  if (typeName === 'string') {
    return Buffer.from(data, 'utf-8').toString('hex');
  }
  const numberMatch = paramTypeNumber.exec(typeName);
  if (numberMatch) {
    const [_, intType, bits] = numberMatch;
    const bytes = Math.ceil(parseInt(bits, 10) / 8);
    return intToHex(data, bytes, intType === 'int');
  }
  if (typeName === 'bool') {
    return data ? '01' : '00';
  }

  // We should be receiving only atomic, non-array types
  throw ERRORS.TypedError(
    HardwareErrorCode.RuntimeError,
    `Unsupported data type for direct field encoding: ${typeName}`
  );
};

// these are simple types, so we can just do a string-match
const paramTypesMap: Record<string, EthereumDataType> = {
  string: EthereumDataType.STRING,
  bool: EthereumDataType.BOOL,
  address: EthereumDataType.ADDRESS,
};

/**
 * Converts the given EIP-712 typename into a Protobuf package.
 *
 * @param typeName - The EIP-712 typename (e.g. `uint16` for simple types, `Example` for structs)
 * @param types - Map of types, required for recursive (`struct`) types.
 */
export const getFieldType = (
  typeName: string,
  types: EthereumSignTypedDataTypes
): EthereumFieldType => {
  const arrayMatch = paramTypeArray.exec(typeName);
  if (arrayMatch) {
    const [_, arrayItemTypeName, arraySize] = arrayMatch;
    const entryType = getFieldType(arrayItemTypeName, types);
    return {
      data_type: EthereumDataType.ARRAY,
      size: parseInt(arraySize, 10) || undefined,
      entry_type: entryType,
    };
  }

  const numberMatch = paramTypeNumber.exec(typeName);
  if (numberMatch) {
    const [_, type, bits] = numberMatch;
    return {
      data_type: type === 'uint' ? EthereumDataType.UINT : EthereumDataType.INT,
      size: Math.floor(parseInt(bits, 10) / 8),
    };
  }

  const bytesMatch = paramTypeBytes.exec(typeName);
  if (bytesMatch) {
    const [_, size] = bytesMatch;
    return {
      data_type: EthereumDataType.BYTES,
      size: parseInt(size, 10) || undefined,
    };
  }

  const fixedSizeTypeMatch = paramTypesMap[typeName];
  if (fixedSizeTypeMatch) {
    return {
      data_type: fixedSizeTypeMatch,
    };
  }

  if (typeName in types) {
    return {
      data_type: EthereumDataType.STRUCT,
      size: types[typeName].length,
      struct_name: typeName,
    };
  }

  throw ERRORS.TypedError(
    HardwareErrorCode.RuntimeError,
    `No type definition specified: ${typeName}`
  );
};
