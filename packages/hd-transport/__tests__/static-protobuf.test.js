import { isDeepStrictEqual } from 'util';
import ByteBuffer from 'bytebuffer';
import * as protobuf from 'protobufjs/light';
import Long from 'long';

import v1 from '@onekeyfe/hd-core/src/data/messages/messages.json';
import legacy from '@onekeyfe/hd-core/src/data/messages/messages_legacy_v1.json';
import v2 from '../messages-protocol-v2.json';
import legacyProtocolInfo from '../src/serialization/protobuf/legacy-protocol-info.json';
import {
  createMessageFromName,
  parseConfigure,
  parseTransportConfigure,
} from '../src/serialization/protobuf/messages';
import { encode } from '../src/serialization/protobuf/encode';
import { decode } from '../src/serialization/protobuf/decode';
import { ProtocolV1, ProtocolV2 } from '../src/protocols';

protobuf.util.Long = Long;
protobuf.configure();

const PRIMITIVE_TYPES = new Set([
  'double',
  'float',
  'int32',
  'uint32',
  'sint32',
  'fixed32',
  'sfixed32',
  'int64',
  'uint64',
  'sint64',
  'fixed64',
  'sfixed64',
  'bool',
  'string',
  'bytes',
]);

function refPatch(Message, payload) {
  const patched = {};
  for (const [key, field] of Object.entries(Message.fields)) {
    const value = payload[key];
    if (value !== undefined) {
      if (PRIMITIVE_TYPES.has(field.type)) {
        const transform = v => {
          if (field.type !== 'bytes') return v;
          if (typeof v === 'string' && !v) return v;
          return Buffer.from(v, 'hex');
        };
        patched[key] = field.repeated ? value.map(transform) : transform(value);
      } else if (field.repeated) {
        const Ref = Message.lookupTypeOrEnum(field.type);
        patched[key] = Ref instanceof protobuf.Enum ? value : value.map(v => refPatch(Ref, v));
      } else if (typeof value === 'object' && value !== null) {
        patched[key] = refPatch(Message.lookupType(field.type), value);
      } else if (typeof value === 'number') {
        patched[key] = Message.lookupEnum(field.type).values[value];
      } else {
        patched[key] = value;
      }
    }
  }
  return patched;
}

function refEncode(Message, data) {
  return Buffer.from(Message.encode(Message.fromObject(refPatch(Message, data))).finish());
}

function refDecode(Message, bytes) {
  const decoded = Message.decode(new Uint8Array(bytes));
  const toJson = (msg, fields) => {
    const plain = { ...msg };
    const res = {};
    for (const [key, field] of Object.entries(fields)) {
      const val = plain[key];
      if (val == null) {
        if (field.optional) res[key] = null;
      } else if (field.repeated) {
        if (PRIMITIVE_TYPES.has(field.type)) {
          res[key] = val.map(v => {
            if (field.type === 'bytes') return ByteBuffer.wrap(v).toString('hex');
            if (field.long) return Number.isSafeInteger(v.toNumber()) ? v.toNumber() : v.toString();
            return v;
          });
        } else if ('valuesById' in field.resolvedType) {
          res[key] = val;
        } else {
          res[key] = val.map(v => toJson(v, field.resolvedType.fields));
        }
      } else if (PRIMITIVE_TYPES.has(field.type)) {
        if (field.type === 'bytes') res[key] = ByteBuffer.wrap(val).toString('hex');
        else if (field.long)
          res[key] = Number.isSafeInteger(val.toNumber()) ? val.toNumber() : val.toString();
        else res[key] = val;
      } else if ('valuesById' in field.resolvedType) {
        res[key] = field.resolvedType.valuesById[val];
      } else {
        res[key] = toJson(val, field.resolvedType.fields);
      }
    }
    return res;
  };
  return toJson(decoded, decoded.$type.fields);
}

function seed(type, mode, depth = 0) {
  const result = {};
  if (depth > 4) return result;
  for (const field of type.fieldsArray) {
    const skipRequired = mode === 'required' && !field.required;
    const skipDeep = field.resolvedType instanceof protobuf.Type && !field.required && depth > 1;
    if (!skipRequired && !skipDeep) {
      let value;
      if (field.resolvedType instanceof protobuf.Type) {
        value = seed(field.resolvedType, mode, depth + 1);
      } else if (field.resolvedType instanceof protobuf.Enum) {
        const keys = Object.keys(field.resolvedType.values);
        const values = Object.values(field.resolvedType.values);
        value = field.repeated
          ? values[mode === 'values' ? Math.min(1, values.length - 1) : 0]
          : keys[mode === 'values' ? Math.min(1, keys.length - 1) : 0];
      } else if (field.type === 'bytes') {
        value = mode === 'values' ? '00ff' : '';
      } else if (field.type === 'string') {
        value = mode === 'values' ? 'test-验证' : '';
      } else if (field.type === 'bool') {
        value = mode === 'values';
      } else if (field.long) {
        value = mode === 'values' ? '9007199254740993' : '0';
      } else {
        value = mode === 'values' ? 1 : 0;
      }
      result[field.name] = field.repeated ? [value] : value;
    }
  }
  return result;
}

describe('@bufbuild/protobuf differential parity with protobufjs', () => {
  test.each([
    ['v1', v1],
    ['legacy-v1', legacy],
    ['v2', v2],
    ['legacy-protocol-info', legacyProtocolInfo],
  ])(
    '%s matches protobufjs encode and decode byte-for-byte on all hardware messages',
    (_, schema) => {
      const refRoot = protobuf.Root.fromJSON(schema);
      refRoot.resolveAll();
      const bufRoot = parseTransportConfigure(schema);

      let checked = 0;
      for (const bufType of bufRoot.listTypes()) {
        if (!bufType.fullName.startsWith('google.protobuf.')) {
          const refType = refRoot.lookupType(bufType.fullName);
          for (const mode of ['required', 'zeros', 'values']) {
            const input = seed(refType, mode);
            const refBytes = refEncode(refType, input);
            const bufBytes = Buffer.from(encode(bufType, input).toBuffer());
            expect(bufBytes.equals(refBytes)).toBe(true);

            const refDecoded = refDecode(refType, refBytes);
            const bufDecoded = decode(bufType, ByteBuffer.wrap(refBytes));
            expect(isDeepStrictEqual(bufDecoded, refDecoded)).toBe(true);
            checked += 1;
          }
        }
      }
      expect(checked).toBeGreaterThan(0);
    }
  );

  test('ProtocolV1 and ProtocolV2 round-trip Ping through parseTransportConfigure', () => {
    const v1Root = parseTransportConfigure(v1);
    const v2Root = parseTransportConfigure(v2);

    const envelope = ProtocolV1.encodeEnvelope(v1Root, 'Ping', { message: 'hello-v1' });
    const decodedV1 = ProtocolV1.decodeMessage(v1Root, envelope.toString('hex'));
    expect(decodedV1.type).toBe('Ping');
    expect(decodedV1.message.message).toBe('hello-v1');

    const frame = ProtocolV2.encodeFrame(
      { protocolV1: v1Root, protocolV2: v2Root },
      'Ping',
      { message: 'protocol-v2-probe' },
      { seq: 1 }
    );
    const decodedV2 = ProtocolV2.decodeFrame({ protocolV1: v1Root, protocolV2: v2Root }, frame);
    expect(decodedV2.type).toBe('Ping');
    expect(decodedV2.message.message).toBe('protocol-v2-probe');
  });

  test('parseConfigure supports custom JSON schemas without eval', () => {
    const customRoot = parseConfigure({
      nested: {
        MessageType: { values: { MessageType_CustomPing: 42 } },
        CustomPing: {
          fields: {
            note: { id: 1, type: 'string' },
            counters: { id: 2, type: 'uint32', rule: 'repeated' },
          },
        },
      },
    });
    const { Message, messageTypeId } = createMessageFromName(customRoot, 'CustomPing');
    expect(messageTypeId).toBe(42);
    const encoded = encode(Message, { note: 'custom', counters: [1, 2, 42] });
    expect(decode(Message, encoded)).toStrictEqual({ note: 'custom', counters: [1, 2, 42] });
  });
});
