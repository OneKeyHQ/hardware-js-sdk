import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import BigNumber from 'bignumber.js';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import type {
  EthereumSignTypedDataMessage,
  EthereumSignTypedDataTypeProperty,
  EthereumSignTypedDataTypes,
} from '../../types';

const ARRAY_TYPE_PATTERN = /^(.*)\[([0-9]*)\]$/;
const INT_TYPE_PATTERN = /^(u?int)([0-9]*)$/;
const BYTES_TYPE_PATTERN = /^bytes([0-9]*)$/;
const HEX_PATTERN = /^[0-9a-fA-F]*$/;

// bignumber.js is used instead of native BigInt so signing keeps working on
// older React Native and browser runtimes that do not expose BigInt.
const UINT256_MODULO = new BigNumber(2).pow(256);
const WORD_BYTE_LENGTH = 32;

// EIP-712 keeps the canonical domain field order for payloads that omit the
// EIP712Domain type definition.
const CANONICAL_DOMAIN_FIELDS: EthereumSignTypedDataTypeProperty[] = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
];

const invalidTypedData = (message: string): never => {
  throw ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, message);
};

const toHexBytes = (value: unknown, fieldName: string): Uint8Array => {
  if (typeof value !== 'string') {
    return invalidTypedData(`${fieldName} must be a hex string`);
  }
  const hex = value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
  if (!HEX_PATTERN.test(hex) || hex.length % 2 !== 0) {
    return invalidTypedData(`${fieldName} must be an even-length hex string`);
  }
  return hexToBytes(hex);
};

const toBigNumber = (value: unknown, fieldName: string): BigNumber => {
  if (typeof value === 'bigint') {
    return new BigNumber(value.toString());
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      return invalidTypedData(`${fieldName} must be a safe integer`);
    }
    return new BigNumber(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const isNegative = trimmed.startsWith('-');
    const unsigned = isNegative ? trimmed.slice(1) : trimmed;
    const isHex = /^0x[0-9a-fA-F]+$/.test(unsigned);
    if (!isHex && !/^[0-9]+$/.test(unsigned)) {
      return invalidTypedData(`${fieldName} must be an integer`);
    }
    const parsed = isHex ? new BigNumber(unsigned.slice(2), 16) : new BigNumber(unsigned, 10);
    return isNegative ? parsed.negated() : parsed;
  }
  return invalidTypedData(`${fieldName} must be an integer`);
};

const encodeWord = (value: BigNumber): Uint8Array => {
  const remainder = value.mod(UINT256_MODULO);
  const normalized = remainder.isNegative() ? remainder.plus(UINT256_MODULO) : remainder;
  return hexToBytes(normalized.toString(16).padStart(WORD_BYTE_LENGTH * 2, '0'));
};

const encodeAddress = (value: unknown, fieldName: string): Uint8Array => {
  const hex = toHexBytes(value, fieldName);
  if (hex.length !== 20) {
    return invalidTypedData(`${fieldName} must be a 20-byte address`);
  }
  const word = new Uint8Array(WORD_BYTE_LENGTH);
  word.set(hex, WORD_BYTE_LENGTH - hex.length);
  return word;
};

const encodeFixedBytes = (size: number, value: unknown, fieldName: string): Uint8Array => {
  const bytes = toHexBytes(value, fieldName);
  if (bytes.length > size) {
    return invalidTypedData(`${fieldName} exceeds bytes${size}`);
  }
  const word = new Uint8Array(WORD_BYTE_LENGTH);
  word.set(bytes, 0);
  return word;
};

const encodePrimitive = (typeName: string, value: unknown, fieldName: string): Uint8Array => {
  if (typeName === 'address') {
    return encodeAddress(value, fieldName);
  }

  if (typeName === 'bool') {
    if (typeof value !== 'boolean') {
      return invalidTypedData(`${fieldName} must be a boolean`);
    }
    return encodeWord(new BigNumber(value ? 1 : 0));
  }

  const intMatch = INT_TYPE_PATTERN.exec(typeName);
  if (intMatch) {
    const [, signedness, bitSize] = intMatch;
    const bits = bitSize ? parseInt(bitSize, 10) : 256;
    if (bits < 8 || bits > 256 || bits % 8 !== 0) {
      return invalidTypedData(`Unsupported EIP-712 integer type ${typeName}`);
    }
    const number = toBigNumber(value, fieldName);
    if (signedness === 'uint') {
      if (number.isNegative() || number.gte(new BigNumber(2).pow(bits))) {
        return invalidTypedData(`${fieldName} is out of range for ${typeName}`);
      }
    } else {
      const signedBound = new BigNumber(2).pow(bits - 1);
      if (number.lt(signedBound.negated()) || number.gte(signedBound)) {
        return invalidTypedData(`${fieldName} is out of range for ${typeName}`);
      }
    }
    return encodeWord(number);
  }

  const bytesMatch = BYTES_TYPE_PATTERN.exec(typeName);
  if (bytesMatch) {
    const size = bytesMatch[1] ? parseInt(bytesMatch[1], 10) : 0;
    if (size < 1 || size > 32) {
      return invalidTypedData(`Unsupported EIP-712 bytes type ${typeName}`);
    }
    return encodeFixedBytes(size, value, fieldName);
  }

  return invalidTypedData(`Unsupported EIP-712 type ${typeName}`);
};

const baseTypeName = (typeName: string): string => {
  let base = typeName;
  while (ARRAY_TYPE_PATTERN.test(base)) {
    base = ARRAY_TYPE_PATTERN.exec(base)?.[1] ?? base;
  }
  return base;
};

const getTypeDefinition = (
  typeName: string,
  types: EthereumSignTypedDataTypes
): EthereumSignTypedDataTypeProperty[] => {
  const fields = types[typeName];
  if (!fields) {
    return invalidTypedData(`Type ${typeName} was not defined in types object`);
  }
  return fields;
};

const encodeType = (primaryType: string, types: EthereumSignTypedDataTypes): string => {
  const dependencies = new Set<string>();

  const visitType = (typeName: string) => {
    const base = baseTypeName(typeName);
    if (base === primaryType || !types[base] || dependencies.has(base)) {
      return;
    }
    dependencies.add(base);
    getTypeDefinition(base, types).forEach(field => visitType(field.type));
  };

  getTypeDefinition(primaryType, types).forEach(field => visitType(field.type));

  const orderedTypes = [primaryType, ...Array.from(dependencies).sort()];
  return orderedTypes
    .map(
      typeName =>
        `${typeName}(${getTypeDefinition(typeName, types)
          .map(field => `${field.type} ${field.name}`)
          .join(',')})`
    )
    .join('');
};

const encodeStructData = (
  typeName: string,
  value: unknown,
  types: EthereumSignTypedDataTypes,
  metamaskV4Compat: boolean
): Uint8Array => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalidTypedData(`${typeName} value must be an object`);
  }

  const fields = getTypeDefinition(typeName, types);
  return concatBytes(
    ...fields.map(field =>
      encodeValue(
        field.type,
        (value as Record<string, unknown>)[field.name],
        types,
        field.name,
        metamaskV4Compat
      )
    )
  );
};

const hashStruct = (
  typeName: string,
  value: unknown,
  types: EthereumSignTypedDataTypes,
  metamaskV4Compat: boolean
): Uint8Array => {
  const typeHash = keccak_256(utf8ToBytes(encodeType(typeName, types)));
  return keccak_256(
    concatBytes(typeHash, encodeStructData(typeName, value, types, metamaskV4Compat))
  );
};

const encodeValue = (
  typeName: string,
  value: unknown,
  types: EthereumSignTypedDataTypes,
  fieldName: string,
  metamaskV4Compat: boolean
): Uint8Array => {
  if (value === undefined || value === null) {
    return invalidTypedData(`${fieldName} is missing from the EIP-712 message`);
  }

  const arrayMatch = ARRAY_TYPE_PATTERN.exec(typeName);
  if (arrayMatch) {
    const [, entryTypeName, arraySize] = arrayMatch;
    if (!Array.isArray(value)) {
      return invalidTypedData(`${fieldName} must be an array`);
    }
    const expectedSize = arraySize ? parseInt(arraySize, 10) : null;
    if (expectedSize !== null && value.length !== expectedSize) {
      return invalidTypedData(`${fieldName} must contain exactly ${expectedSize} entries`);
    }
    // MetaMask V4 hashes struct array entries as full structs. The strict EIP-712
    // encoding concatenates the entry field data without the struct type hash.
    const isStructEntry = Boolean(types[entryTypeName]);
    return keccak_256(
      concatBytes(
        ...value.map((entry, index) =>
          isStructEntry && !metamaskV4Compat
            ? encodeStructData(entryTypeName, entry, types, metamaskV4Compat)
            : encodeValue(entryTypeName, entry, types, `${fieldName}[${index}]`, metamaskV4Compat)
        )
      )
    );
  }

  if (typeName === 'string') {
    if (typeof value !== 'string') {
      return invalidTypedData(`${fieldName} must be a string`);
    }
    return keccak_256(utf8ToBytes(value));
  }

  if (typeName === 'bytes') {
    if (value instanceof Uint8Array) {
      return keccak_256(value);
    }
    if (value instanceof ArrayBuffer) {
      return keccak_256(new Uint8Array(value));
    }
    return keccak_256(toHexBytes(value, fieldName));
  }

  if (types[typeName]) {
    return hashStruct(typeName, value, types, metamaskV4Compat);
  }

  return encodePrimitive(typeName, value, fieldName);
};

const getDomainTypeDefinition = (
  data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>
): EthereumSignTypedDataTypeProperty[] => {
  const declaredFields = data.types?.EIP712Domain;
  // An explicitly declared domain type is authoritative even when empty;
  // inferring fields would produce a different digest than the structured path.
  if (declaredFields) {
    return declaredFields;
  }
  const domain = data.domain as Record<string, unknown> | undefined;
  const inferredFields = CANONICAL_DOMAIN_FIELDS.filter(field =>
    Object.prototype.hasOwnProperty.call(domain ?? {}, field.name)
  );
  return inferredFields;
};

export type EIP712Hashes = {
  domainHash: string;
  messageHash?: string;
};

/**
 * Computes the EIP-712 domain separator and message struct hash used by the
 * typed-hash (blind signing) firmware path. This is the same hashStruct
 * encoding described by EIP-712, not the final 0x1901 signing digest.
 */
export const getEIP712Hashes = (
  data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>,
  metamaskV4Compat = true
): EIP712Hashes => {
  if (!data?.types || !data.primaryType) {
    return invalidTypedData('EIP-712 data and primaryType are required');
  }

  const domainTypes: EthereumSignTypedDataTypes = {
    ...data.types,
    EIP712Domain: getDomainTypeDefinition(data),
  };
  const domainHash = bytesToHex(
    hashStruct('EIP712Domain', data.domain ?? {}, domainTypes, metamaskV4Compat)
  );

  const primaryType = data.primaryType as string;

  // A domain-only request has no message struct; the firmware derives the
  // signing digest from the domain separator alone.
  if (primaryType === 'EIP712Domain') {
    return { domainHash: `0x${domainHash}` };
  }

  if (!data.types[primaryType]) {
    return invalidTypedData(`Type ${primaryType} was not defined in types object`);
  }

  const messageHash = bytesToHex(
    hashStruct(primaryType, data.message ?? {}, data.types, metamaskV4Compat)
  );
  return {
    domainHash: `0x${domainHash}`,
    messageHash: `0x${messageHash}`,
  };
};
