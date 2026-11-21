import { Buffer } from 'buffer';
import ByteBuffer from 'bytebuffer';
import { ScalarType, create, toBinary } from '@bufbuild/protobuf';
// eslint-disable-next-line import/no-unresolved, camelcase
import { FieldDescriptorProto_Label as FieldLabel } from '@bufbuild/protobuf/wkt';

import { ensureTextEncoding } from './text-encoding';

import type { DescEnum, DescField, DescMessage, Message } from '@bufbuild/protobuf';
import type { ProtobufMessageType } from './descriptor';

const is64BitScalar = (scalar: ScalarType): boolean =>
  scalar === ScalarType.INT64 ||
  scalar === ScalarType.UINT64 ||
  scalar === ScalarType.SINT64 ||
  scalar === ScalarType.FIXED64 ||
  scalar === ScalarType.SFIXED64;

const isUnsigned64Scalar = (scalar: ScalarType): boolean =>
  scalar === ScalarType.UINT64 || scalar === ScalarType.FIXED64;

const isUnsigned32Scalar = (scalar: ScalarType): boolean =>
  scalar === ScalarType.UINT32 || scalar === ScalarType.FIXED32;

const isSigned32Scalar = (scalar: ScalarType): boolean =>
  scalar === ScalarType.INT32 || scalar === ScalarType.SINT32 || scalar === ScalarType.SFIXED32;

const toBigInt64 = (scalar: ScalarType, value: unknown): bigint => {
  let raw: bigint;
  if (typeof value === 'bigint') {
    raw = value;
  } else if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError('field value is not within safe integer range');
    }
    raw = BigInt(value);
  } else if (typeof value === 'string') {
    if (value === '') {
      throw new Error('empty string');
    }
    raw = BigInt(value);
  } else if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toString: unknown }).toString === 'function'
  ) {
    raw = BigInt(String(value));
  } else {
    throw new TypeError(`Unsupported 64-bit integer value: ${typeof value}`);
  }
  return isUnsigned64Scalar(scalar) ? BigInt.asUintN(64, raw) : BigInt.asIntN(64, raw);
};

const encodeScalar = (scalar: ScalarType, value: unknown): unknown => {
  if (
    typeof value === 'number' &&
    scalar !== ScalarType.FLOAT &&
    scalar !== ScalarType.DOUBLE &&
    !Number.isSafeInteger(value)
  ) {
    throw new RangeError('field value is not within safe integer range');
  }

  if (scalar === ScalarType.BYTES) {
    if (typeof value === 'string') {
      return value.length === 0 ? new Uint8Array(0) : new Uint8Array(Buffer.from(value, 'hex'));
    }
    if (value instanceof Uint8Array) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (Array.isArray(value)) {
      return Uint8Array.from(value as number[]);
    }
    return new Uint8Array(Buffer.from(value as string, 'hex'));
  }

  if (is64BitScalar(scalar)) {
    return toBigInt64(scalar, value);
  }

  if (scalar === ScalarType.BOOL) {
    return Boolean(value);
  }

  if (scalar === ScalarType.STRING) {
    return typeof value === 'string' ? value : String(value);
  }

  const num = Number(value);
  if (isUnsigned32Scalar(scalar) && Number.isInteger(num) && num >= -0x80000000 && num < 0) {
    // Preserve legacy protobufjs 32-bit bit-pattern compatibility for signed int32 inputs
    // passed to uint32/fixed32 fields (e.g. BTC RefTransaction.version with high bit set).
    return num + 0x100000000;
  }
  if (isSigned32Scalar(scalar) && Number.isInteger(num) && num > 0x7fffffff && num <= 0xffffffff) {
    return num - 0x100000000;
  }
  return num;
};

const encodeEnum = (enumDesc: DescEnum, value: unknown): number | undefined => {
  if (typeof value === 'string') {
    const matched = enumDesc.values.find(v => v.name === value);
    if (matched) return matched.number;
    const numeric = Number(value);
    if (Number.isInteger(numeric)) return numeric;
    return undefined;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError('field value is not within safe integer range');
    }
    return value;
  }
  return undefined;
};

const defaultForRequiredScalarOrEnum = (field: DescField): unknown => {
  if (field.fieldKind === 'scalar') {
    const explicit = field.getDefaultValue();
    if (explicit !== undefined) return explicit;
    if (field.scalar === ScalarType.BYTES) return new Uint8Array(0);
    if (field.scalar === ScalarType.STRING) return '';
    if (field.scalar === ScalarType.BOOL) return false;
    if (is64BitScalar(field.scalar)) return BigInt(0);
    return 0;
  }
  if (field.fieldKind === 'enum') {
    const explicit = field.getDefaultValue();
    if (explicit !== undefined) return explicit;
    return field.enum.values[0]?.number ?? 0;
  }
  return undefined;
};

function buildMessage(desc: DescMessage, payload: Record<string, unknown>): Message {
  const msg = create(desc) as unknown as Record<string, unknown>;

  for (const field of desc.fields) {
    const value = payload[field.name];
    if (value === undefined || value === null) {
      if (field.fieldKind !== 'list' && field.proto.label === FieldLabel.REQUIRED) {
        msg[field.localName] =
          field.fieldKind === 'message'
            ? buildMessage(field.message, {})
            : defaultForRequiredScalarOrEnum(field);
      }
    } else if (field.fieldKind === 'list') {
      if (Array.isArray(value)) {
        if (field.listKind === 'scalar') {
          msg[field.localName] = value.map(v => encodeScalar(field.scalar, v));
        } else if (field.listKind === 'enum') {
          msg[field.localName] = value
            .map(v => encodeEnum(field.enum, v))
            .filter((v): v is number => v !== undefined);
        } else if (field.listKind === 'message') {
          msg[field.localName] = value.map(v =>
            buildMessage(field.message, (v ?? {}) as Record<string, unknown>)
          );
        }
      }
    } else if (field.fieldKind === 'scalar') {
      const encodedScalar = encodeScalar(field.scalar, value);
      // Match protobufjs fromObject: 0-length bytes from a Buffer/Uint8Array or non-empty
      // non-hex string (e.g. Buffer.from('0x...', 'hex')) are omitted on optional bytes fields,
      // whereas an explicit empty string '' is still encoded as 0-length bytes.
      const omitEmptyOptionalBytes =
        field.scalar === ScalarType.BYTES &&
        field.proto.label !== FieldLabel.REQUIRED &&
        encodedScalar instanceof Uint8Array &&
        encodedScalar.byteLength === 0 &&
        value !== '';
      if (!omitEmptyOptionalBytes) {
        msg[field.localName] = encodedScalar;
      }
    } else if (field.fieldKind === 'enum') {
      const enumNumber = encodeEnum(field.enum, value);
      if (enumNumber !== undefined) {
        msg[field.localName] = enumNumber;
      }
    } else if (field.fieldKind === 'message') {
      if (typeof value === 'object') {
        msg[field.localName] = buildMessage(field.message, value as Record<string, unknown>);
      }
    }
  }

  return msg as unknown as Message;
}

export const encode = (
  messageType: ProtobufMessageType,
  data: Record<string, unknown>
): ByteBuffer => {
  ensureTextEncoding();
  const message = buildMessage(messageType.desc, data ?? {});
  const buffer = toBinary(messageType.desc, message);
  const bytebuffer = new ByteBuffer(buffer.byteLength);
  bytebuffer.append(buffer);
  bytebuffer.reset();
  return bytebuffer;
};
