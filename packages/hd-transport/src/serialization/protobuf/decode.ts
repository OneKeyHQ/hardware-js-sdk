import { Buffer } from 'buffer';
import ByteBuffer from 'bytebuffer';

import { getProtobuf, getProtobufWkt } from './runtime';
import { ensureTextEncoding } from './text-encoding';

import type { DescMessage, Message, ScalarType } from '@bufbuild/protobuf';
import type { ProtobufMessageType } from './descriptor';

const is64BitScalar = (scalar: ScalarType): boolean => {
  const { ScalarType: S } = getProtobuf();
  return (
    scalar === S.INT64 ||
    scalar === S.UINT64 ||
    scalar === S.SINT64 ||
    scalar === S.FIXED64 ||
    scalar === S.SFIXED64
  );
};

const decodeScalar = (scalar: ScalarType, value: unknown): unknown => {
  const { ScalarType: S } = getProtobuf();
  if (scalar === S.BYTES) {
    if (value instanceof Uint8Array) {
      return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('hex');
    }
    return ByteBuffer.wrap(value as ArrayBuffer).toString('hex');
  }

  if (is64BitScalar(scalar)) {
    const bigVal = typeof value === 'bigint' ? value : BigInt(String(value));
    const numVal = Number(bigVal);
    if (Number.isSafeInteger(numVal) && BigInt(numVal) === bigVal) {
      return numVal;
    }
    return bigVal.toString();
  }

  return value;
};

function assertRequiredFields(desc: DescMessage, decoded: Message): void {
  const { isFieldSet } = getProtobuf();
  const { FieldDescriptorProto_Label: FieldLabel } = getProtobufWkt();
  const record = decoded as unknown as Record<string, unknown>;
  for (const field of desc.fields) {
    if (field.fieldKind === 'list') {
      if (field.listKind === 'message') {
        const list = record[field.localName];
        if (Array.isArray(list)) {
          for (const item of list) {
            assertRequiredFields(field.message, item as Message);
          }
        }
      }
    } else {
      if (field.proto.label === FieldLabel.REQUIRED && !isFieldSet(decoded, field)) {
        // Proto2 closed enums place unknown wire values (e.g. a newer firmware FailureType)
        // in `$unknown` instead of setting the field; preserve wire presence so Core still
        // receives the firmware message and fallback error path.
        const hasUnknownEnumWireValue =
          field.fieldKind === 'enum' && decoded.$unknown?.some(u => u.no === field.number) === true;
        if (!hasUnknownEnumWireValue) {
          throw new Error(`missing required '${field.name}'`);
        }
      }
      if (field.fieldKind === 'message' && isFieldSet(decoded, field)) {
        const sub = record[field.localName];
        if (sub != null) {
          assertRequiredFields(field.message, sub as Message);
        }
      }
    }
  }
}

function messageToJSON(desc: DescMessage, decoded: Message): Record<string, unknown> {
  const { isFieldSet } = getProtobuf();
  const { FieldDescriptorProto_Label: FieldLabel } = getProtobufWkt();
  const record = decoded as unknown as Record<string, unknown>;
  const res: Record<string, unknown> = {};

  for (const field of desc.fields) {
    const isOptional = field.fieldKind !== 'list' && field.proto.label !== FieldLabel.REQUIRED;

    if (field.fieldKind === 'list') {
      const list = record[field.localName];
      if (!Array.isArray(list) || list.length === 0) {
        res[field.name] = [];
      } else if (field.listKind === 'scalar') {
        res[field.name] = list.map(v => decodeScalar(field.scalar, v));
      } else if (field.listKind === 'enum') {
        // [compatibility]: keep array enums as array of numbers.
        res[field.name] = [...list];
      } else if (field.listKind === 'message') {
        res[field.name] = list.map(v => messageToJSON(field.message, v as Message));
      }
    } else if (!isFieldSet(decoded, field)) {
      if (isOptional) {
        res[field.name] = null;
      }
    } else {
      const value = record[field.localName];
      if (value == null) {
        if (isOptional) {
          res[field.name] = null;
        }
      } else if (field.fieldKind === 'scalar') {
        res[field.name] = decodeScalar(field.scalar, value);
      } else if (field.fieldKind === 'enum') {
        res[field.name] = field.enum.value[value as number]?.name;
      } else if (field.fieldKind === 'message') {
        res[field.name] = messageToJSON(field.message, value as Message);
      }
    }
  }

  return res;
}

export const decode = (
  messageType: ProtobufMessageType,
  data: ByteBuffer
): Record<string, unknown> => {
  ensureTextEncoding();
  const { fromBinary } = getProtobuf();
  const buff = data.toBuffer();
  const a = new Uint8Array(buff);

  let decoded: Message;
  try {
    decoded = fromBinary(messageType.desc, a);
    assertRequiredFields(messageType.desc, decoded);
  } catch (error) {
    // Fix a battery_level problem with the device
    if (a.length > 1 && a[a.length - 1] === 0xff) {
      a[a.length - 1] = 0x04;
      decoded = fromBinary(messageType.desc, a);
      assertRequiredFields(messageType.desc, decoded);
    } else {
      throw error;
    }
  }

  return messageToJSON(messageType.desc, decoded);
};
