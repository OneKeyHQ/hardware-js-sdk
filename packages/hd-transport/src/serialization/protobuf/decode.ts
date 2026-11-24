import { Buffer } from 'buffer';
import ByteBuffer from 'bytebuffer';

// Must execute before @bufbuild/protobuf imports so Jest/CJS cold-start configures text encoding first.
// eslint-disable-next-line import/order
import { ensureTextEncoding } from './text-encoding';
// eslint-disable-next-line import/order
import { getFieldValue, getMessageDesc } from './descriptor';

// eslint-disable-next-line import/order
import { ScalarType, fromBinary, isFieldSet } from '@bufbuild/protobuf';
// eslint-disable-next-line camelcase, import/no-unresolved, import/order
import { FieldDescriptorProto_Label as FieldLabel } from '@bufbuild/protobuf/wkt';

import type { DescMessage, Message } from '@bufbuild/protobuf';
import type { ProtobufMessageType } from './descriptor';

const is64BitScalar = (scalar: ScalarType): boolean =>
  scalar === ScalarType.INT64 ||
  scalar === ScalarType.UINT64 ||
  scalar === ScalarType.SINT64 ||
  scalar === ScalarType.FIXED64 ||
  scalar === ScalarType.SFIXED64;

const decodeScalar = (scalar: ScalarType, value: unknown): unknown => {
  if (scalar === ScalarType.BYTES) {
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
        const sub = getFieldValue(record, field);
        if (sub != null) {
          assertRequiredFields(field.message, sub as Message);
        }
      }
    }
  }
}

function messageToJSON(desc: DescMessage, decoded: Message): Record<string, unknown> {
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
      const value = getFieldValue(record, field);
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
  const desc = getMessageDesc(messageType);
  const buff = data.toBuffer();
  const a = new Uint8Array(buff);

  let decoded: Message;
  try {
    decoded = fromBinary(desc, a);
    assertRequiredFields(desc, decoded);
  } catch (error) {
    // Fix a battery_level problem with the device
    if (a.length > 1 && a[a.length - 1] === 0xff) {
      a[a.length - 1] = 0x04;
      decoded = fromBinary(desc, a);
      assertRequiredFields(desc, decoded);
    } else {
      throw error;
    }
  }

  return messageToJSON(desc, decoded);
};
