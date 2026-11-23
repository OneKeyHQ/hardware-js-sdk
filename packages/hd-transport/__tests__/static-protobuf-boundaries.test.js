import ByteBuffer from 'bytebuffer';
import Long from 'long';
// eslint-disable-next-line import/no-unresolved
import { BinaryWriter, WireType } from '@bufbuild/protobuf/wire';

import v1 from '@onekeyfe/hd-core/src/data/messages/messages.json';
import v2 from '../messages-protocol-v2.json';
import {
  createMessageFromName,
  parseConfigure,
  parseTransportConfigure,
} from '../src/serialization/protobuf/messages';
import { encode } from '../src/serialization/protobuf/encode';
import { decode } from '../src/serialization/protobuf/decode';

describe('@bufbuild/protobuf boundary semantics', () => {
  const v1Root = parseTransportConfigure(v1);
  const v2Root = parseTransportConfigure(v2);

  test('preserves empty byte entries in repeated bytes fields (e.g. multisig signatures)', () => {
    const { Message } = createMessageFromName(v1Root, 'TxAck');
    const encoded = encode(Message, {
      tx: {
        inputs: [
          {
            address_n: [0x80000031, 0x80000000, 0x80000000, 0, 0],
            prev_hash: '00'.repeat(32),
            prev_index: 0,
            multisig: {
              pubkeys: [],
              signatures: ['', 'deadbeef', ''],
              m: 2,
            },
          },
        ],
      },
    });
    const decoded = decode(Message, encoded);
    expect(decoded.tx.inputs[0].multisig.signatures).toStrictEqual(['', 'deadbeef', '']);
  });

  test('decodes 64-bit integers as safe numbers when in range and strings when outside safe range', () => {
    const root = parseConfigure({
      nested: {
        LongBox: {
          fields: {
            u64_safe: { id: 1, type: 'uint64' },
            u64_big: { id: 2, type: 'uint64' },
            s64_neg: { id: 3, type: 'sint64' },
            i64_neg_big: { id: 4, type: 'int64' },
          },
        },
      },
    });
    const Msg = root.lookupType('LongBox');
    const encoded = encode(Msg, {
      u64_safe: 42,
      u64_big: '18446744073709551615',
      s64_neg: -123456,
      i64_neg_big: '-9223372036854775808',
    });
    expect(decode(Msg, encoded)).toStrictEqual({
      u64_safe: 42,
      u64_big: '18446744073709551615',
      s64_neg: -123456,
      i64_neg_big: '-9223372036854775808',
    });
  });

  test('throws RangeError on unsafe JS numbers', () => {
    const { Message } = createMessageFromName(v1Root, 'Ping');
    const root = parseConfigure({
      nested: {
        NumMsg: { fields: { amount: { id: 1, type: 'uint64' } } },
      },
    });
    expect(Message).toBeDefined();
    expect(() =>
      encode(root.lookupType('NumMsg'), { amount: Number.MAX_SAFE_INTEGER + 1 })
    ).toThrow(RangeError);
  });

  test('decodes absent optional fields as null and empty repeated fields as []', () => {
    const { Message } = createMessageFromName(v2Root, 'DeviceSession');
    const encoded = encode(Message, {});
    expect(decode(Message, encoded)).toStrictEqual({
      session_id: null,
      btc_test_address: null,
      seed_domains: [],
    });
  });

  test('throws when a required proto2 field is missing on the wire', () => {
    const { Message } = createMessageFromName(v2Root, 'ProtocolInfo');
    expect(() => decode(Message, ByteBuffer.wrap(new Uint8Array([0x08, 0x01])))).toThrow(
      "missing required 'build_fingerprint'"
    );
  });

  test('throws on malformed wire bytes', () => {
    const { Message } = createMessageFromName(v1Root, 'Features');
    expect(() => decode(Message, ByteBuffer.wrap(new Uint8Array([0x0a, 0xff, 0xff])))).toThrow();
  });

  test('matches protobufjs for empty Buffer vs empty string on optional bytes fields', () => {
    const { Message } = createMessageFromName(v1Root, 'CosiCommit');
    const withEmptyBuffer = encode(Message, {
      address_n: [0x80002722, 0x80000000],
      data: Buffer.alloc(0),
    });
    const withEmptyString = encode(Message, {
      address_n: [0x80002722, 0x80000000],
      data: '',
    });
    const withHexBuffer = encode(Message, {
      address_n: [0x80002722, 0x80000000],
      data: Buffer.from('deadbeef', 'hex'),
    });
    expect(withEmptyBuffer.toString('hex')).toBe('08a2ce808008088080808008');
    expect(withEmptyString.toString('hex')).toBe('08a2ce8080080880808080081200');
    expect(decode(Message, withHexBuffer).data).toBe('deadbeef');
  });

  test('encodes Long instances, BigInt, and rejects empty string for 64-bit integer fields', () => {
    const root = parseConfigure({
      nested: {
        Int64Box: {
          fields: {
            u64: { id: 1, type: 'uint64' },
            i64: { id: 2, type: 'int64' },
          },
        },
      },
    });
    const Msg = root.lookupType('Int64Box');
    const fromLong = encode(Msg, {
      u64: Long.fromString('9007199254740993', true),
      i64: Long.fromString('-9223372036854775808', false),
    });
    const fromBigInt = encode(Msg, {
      u64: BigInt('9007199254740993'),
      i64: BigInt('-9223372036854775808'),
    });
    expect(fromLong.toString('hex')).toBe(fromBigInt.toString('hex'));
    expect(decode(Msg, fromLong)).toStrictEqual({
      u64: '9007199254740993',
      i64: '-9223372036854775808',
    });
    expect(() => encode(Msg, { u64: '' })).toThrow('empty string');
  });

  test('encodes enums from either string name or numeric id and decodes singular as name vs repeated as numbers', () => {
    const { Message: GetAddress } = createMessageFromName(v1Root, 'GetAddress');
    const byName = encode(GetAddress, { script_type: 'SPENDWITNESS' });
    const byNumber = encode(GetAddress, { script_type: 3 });
    expect(byName.toString('hex')).toBe('2803');
    expect(byNumber.toString('hex')).toBe('2803');
    expect(decode(GetAddress, byName).script_type).toBe('SPENDWITNESS');

    const { Message: DeviceSession } = createMessageFromName(v2Root, 'DeviceSession');
    const session = encode(DeviceSession, { seed_domains: [1, 2] });
    expect(decode(DeviceSession, session).seed_domains).toStrictEqual([1, 2]);
  });

  test('handles 4-byte emoji UTF-8 and numeric coercion on string fields', () => {
    const { Message: Ping } = createMessageFromName(v1Root, 'Ping');
    const emoji = encode(Ping, { message: '🚀中文hello' });
    expect(decode(Ping, emoji).message).toBe('🚀中文hello');

    const numeric = encode(Ping, { message: 12345 });
    expect(decode(Ping, numeric).message).toBe('12345');
  });

  test('preserves Features singular enum strings and repeated capabilities numbers for Core capability checks', () => {
    const { Message: Features } = createMessageFromName(v1Root, 'Features');
    const encoded = encode(Features, {
      vendor: 'onekey.so',
      capabilities: [1, 5, 17],
      backup_type: 'Bip39',
      safety_checks: 'Strict',
      onekey_device_type: 'CLASSIC1S',
    });
    const decoded = decode(Features, encoded);
    expect(decoded.capabilities).toStrictEqual([1, 5, 17]);
    expect(decoded.backup_type).toBe('Bip39');
    expect(decoded.safety_checks).toBe('Strict');
    expect(decoded.onekey_device_type).toBe('CLASSIC1S');

    const { Message: Failure } = createMessageFromName(v1Root, 'Failure');
    const failEncoded = encode(Failure, { code: 4, message: 'Cancelled' });
    expect(decode(Failure, failEncoded)).toStrictEqual({
      code: 'Failure_ActionCancelled',
      message: 'Cancelled',
    });
  });

  test('works on runtimes without global TextDecoder or TextEncoder (React Native / Hermes)', () => {
    const symbol = Symbol.for('@bufbuild/protobuf/text-encoding');
    const prevEncoding = globalThis[symbol];
    const prevTextDecoder = globalThis.TextDecoder;
    const prevTextEncoder = globalThis.TextEncoder;

    try {
      delete globalThis[symbol];
      globalThis.TextDecoder = undefined;
      globalThis.TextEncoder = undefined;

      const { Message: GetFeatures } = createMessageFromName(v1Root, 'GetFeatures');
      const emptyProbe = encode(GetFeatures, {});
      expect(emptyProbe.toString('hex')).toBe('');

      const { Message: Ping } = createMessageFromName(v1Root, 'Ping');
      const utf8Encoded = encode(Ping, { message: '🚀中文hello' });
      expect(decode(Ping, utf8Encoded).message).toBe('🚀中文hello');

      // Strict UTF-8 validation still rejects invalid sequences.
      const fallback = globalThis[symbol];
      expect(() => fallback.decodeUtf8(new Uint8Array([0xff, 0xfe]), true)).toThrow(TypeError);

      // Fresh cold-start import with TextEncoder/TextDecoder absent must not throw
      // while loading @bufbuild/protobuf or @bufbuild/protobuf/wkt descriptors.
      delete globalThis[symbol];
      jest.isolateModules(() => {
        // eslint-disable-next-line global-require
        const fresh = require('../src/index').default;
        const freshRoot = fresh.parseTransportConfigure(v1);
        const { Message: FreshPing } = fresh.createMessageFromName(freshRoot, 'Ping');
        const roundTrip = FreshPing.decode(FreshPing.encode({ message: '\ufeff🚀中文' }).finish());
        expect(roundTrip.message).toBe('\ufeff🚀中文');
      });
    } finally {
      globalThis[symbol] = prevEncoding;
      globalThis.TextDecoder = prevTextDecoder;
      globalThis.TextEncoder = prevTextEncoder;
    }
  });

  test('preserves wire presence for unknown closed enum values on required fields (Pro2 Failure.code)', () => {
    const { Message: V2Failure } = createMessageFromName(v2Root, 'Failure');
    // Field 1 (required code = 9999 unknown enum), Field 3 (message = "new firmware error")
    const wireBytes = new BinaryWriter()
      .tag(1, WireType.Varint)
      .int32(9999)
      .tag(3, WireType.LengthDelimited)
      .string('new firmware error')
      .finish();

    const decoded = decode(V2Failure, ByteBuffer.wrap(wireBytes));
    expect(decoded.message).toBe('new firmware error');
    expect(decoded.code).toBeUndefined();

    const rawDecoded = V2Failure.decode(wireBytes);
    expect(rawDecoded.message).toBe('new firmware error');

    // Truly missing required code still throws.
    const missingCodeBytes = new BinaryWriter()
      .tag(3, WireType.LengthDelimited)
      .string('no code')
      .finish();
    expect(() => decode(V2Failure, ByteBuffer.wrap(missingCodeBytes))).toThrow(
      /missing required 'code'/
    );
  });

  test('preserves 32-bit signed/unsigned bit-pattern compatibility (BTC RefTransaction.version)', () => {
    const { Message: TxAckPrevMeta } = createMessageFromName(v1Root, 'TxAckPrevMeta');
    const signedVersion = -2147483648; // 0x80000000 as signed int32
    const unsignedVersion = 0x80000000;

    const fromSigned = encode(TxAckPrevMeta, {
      tx: {
        version: signedVersion,
        lock_time: 0,
        inputs_count: 1,
        outputs_count: 1,
      },
    });
    const fromUnsigned = encode(TxAckPrevMeta, {
      tx: {
        version: unsignedVersion,
        lock_time: 0,
        inputs_count: 1,
        outputs_count: 1,
      },
    });

    expect(fromSigned.toString('hex')).toBe(fromUnsigned.toString('hex'));
    expect(decode(TxAckPrevMeta, fromSigned).tx.version).toBe(unsignedVersion);

    // Out-of-range values are still rejected.
    expect(() =>
      encode(TxAckPrevMeta, {
        tx: {
          version: -2147483649,
          lock_time: 0,
          inputs_count: 1,
          outputs_count: 1,
        },
      })
    ).toThrow();
    expect(() =>
      encode(TxAckPrevMeta, {
        tx: {
          version: 0x100000000,
          lock_time: 0,
          inputs_count: 1,
          outputs_count: 1,
        },
      })
    ).toThrow();
  });

  test('ignores empty/whitespace enum strings, coerces nullish repeated scalars, and falls back on invalid required fields', () => {
    const { Message: GetAddress } = createMessageFromName(v1Root, 'GetAddress');
    expect(encode(GetAddress, { script_type: '' }).toString('hex')).toBe('');
    expect(encode(GetAddress, { script_type: '   ' }).toString('hex')).toBe('');

    const { Message: Features } = createMessageFromName(v1Root, 'Features');
    const emptyEnumList = encode(Features, { capabilities: ['', '   ', 5] });
    expect(decode(Features, emptyEnumList).capabilities).toStrictEqual([5]);

    const nullishRepeatedScalar = encode(GetAddress, { address_n: [1, undefined, null, 2] });
    expect(decode(GetAddress, nullishRepeatedScalar).address_n).toStrictEqual([1, 0, 0, 2]);

    // Invalid value on a required enum field falls back to the required default instead of omitting it.
    const { Message: V2Failure } = createMessageFromName(v2Root, 'Failure');
    const invalidRequiredEnum = encode(V2Failure, { code: 'NotARealCode', message: 'fallback' });
    const decodedFailure = decode(V2Failure, invalidRequiredEnum);
    expect(decodedFailure.message).toBe('fallback');
    expect(decodedFailure.code).toBeDefined();
  });

  test('Message.encode() supports enum string names, required defaults, and hex bytes', () => {
    const { Message: GetAddress } = createMessageFromName(v1Root, 'GetAddress');
    const rawAddr = GetAddress.encode({ script_type: 'SPENDWITNESS' }).finish();
    expect(decode(GetAddress, ByteBuffer.wrap(rawAddr)).script_type).toBe('SPENDWITNESS');

    const { Message: V2Failure } = createMessageFromName(v2Root, 'Failure');
    const rawFailure = V2Failure.encode({ message: 'default-code' }).finish();
    expect(V2Failure.decode(rawFailure).message).toBe('default-code');

    const { Message: Ping } = createMessageFromName(v1Root, 'Ping');
    const rawPing = Ping.encode({ message: 'hi' }).finish();
    expect(Ping.decode(rawPing).message).toBe('hi');
  });

  test('rejects unresolved field types instead of creating empty placeholders', () => {
    expect(() =>
      parseConfigure({
        nested: {
          Parent: {
            fields: {
              child: { type: 'MissingChild', id: 1 },
            },
          },
        },
      })
    ).toThrow("no such Type or Enum 'MissingChild'");
  });

  test('preserves oneof declarations and exposes the selected field name on decode', () => {
    const oneofRoot = parseConfigure({
      nested: {
        Choice: {
          oneofs: {
            selection: { oneof: ['a', 'b'] },
          },
          fields: {
            a: { type: 'string', id: 1 },
            b: { type: 'uint32', id: 2 },
          },
        },
      },
    });
    const Choice = oneofRoot.lookupType('Choice');

    const rawA = Choice.encode({ a: 'hello' }).finish();
    const decodedRawA = Choice.decode(rawA);
    expect(decodedRawA.a).toBe('hello');
    expect(decodedRawA.selection).toBe('a');
    expect(Object.keys(decodedRawA)).toStrictEqual(['a']);
    expect({ ...decodedRawA }).toStrictEqual({ a: 'hello' });

    // Re-encoding a decoded object must ignore inherited oneof defaults on its prototype.
    const reencodedRawA = Choice.decode(Choice.encode(decodedRawA).finish());
    expect(reencodedRawA.a).toBe('hello');
    expect(reencodedRawA.selection).toBe('a');
    const reencodedViaEncode = decode(Choice, encode(Choice, decodedRawA));
    expect(reencodedViaEncode.a).toBe('hello');
    expect(reencodedViaEncode.b).toBeNull();

    // Mutating own fields updates the virtual oneof discriminator dynamically.
    delete decodedRawA.a;
    decodedRawA.b = 99;
    expect(decodedRawA.selection).toBe('b');

    const rawEmpty = Choice.encode({}).finish();
    const decodedEmpty = Choice.decode(rawEmpty);
    expect(decodedEmpty.selection).toBeUndefined();
    expect(Choice.decode(Choice.encode(decodedEmpty).finish()).selection).toBeUndefined();
    expect(decode(Choice, encode(Choice, decodedEmpty))).toStrictEqual({ a: null, b: null });

    const encodedB = encode(Choice, { b: 42 });
    const decodedB = decode(Choice, encodedB);
    expect(decodedB.b).toBe(42);
    expect(decodedB.a).toBeNull();
  });

  test('preserves plain 64-bit Long bit-pair objects across JSON/structured-clone boundaries', () => {
    const numRoot = parseConfigure({
      nested: {
        Num: {
          fields: {
            u64: { type: 'uint64', id: 1 },
            i64: { type: 'int64', id: 2 },
          },
        },
      },
    });
    const Num = numRoot.lookupType('Num');

    const payload = {
      u64: { low: 7, high: 1, unsigned: true },
      i64: { low: -1, high: -1, unsigned: false },
    };
    const encoded = encode(Num, payload);
    const decoded = decode(Num, encoded);
    expect(decoded).toStrictEqual({
      u64: 4294967303,
      i64: -1,
    });

    const rawEncoded = Num.encode(payload).finish();
    const rawDecoded = Num.decode(rawEncoded);
    expect(rawDecoded.u64).toBe(BigInt(4294967303));
    expect(rawDecoded.i64).toBe(BigInt(-1));
  });
});
