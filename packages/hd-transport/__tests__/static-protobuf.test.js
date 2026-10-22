import { isDeepStrictEqual } from 'util';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import ByteBuffer from 'bytebuffer';
import * as protobuf from 'protobufjs/light';
import Long from 'long';

import v1 from '@onekeyfe/hd-core/src/data/messages/messages.json';
import legacy from '@onekeyfe/hd-core/src/data/messages/messages_legacy_v1.json';
import v2 from '../messages-protocol-v2.json';
import { parseConfigure, createMessageFromName } from '../src/serialization/protobuf/messages';
import { encode } from '../src/serialization/protobuf/encode';
import { decode } from '../src/serialization/protobuf/decode';
import { installStaticCodecs } from '../src/serialization/protobuf/generated/codecs';
import { ProtocolV1, ProtocolV2 } from '../src/protocols';

import { patchFeatures } from '@onekeyfe/hd-core/src/utils/patch';
import { fixFeaturesFirmwareVersion } from '@onekeyfe/hd-core/src/utils/deviceFeaturesUtils';
import { buildProtocolV1FeaturesPayload } from '@onekeyfe/hd-core/src/deviceProfile/buildDeviceFeatures';
import {
  mapFeaturesToState,
  mapProtocolV2DeviceInfoToState,
  mapProtocolV2DeviceStatusToState,
} from '@onekeyfe/hd-core/src/device/DeviceStateMapper';
import { DeviceStateStore } from '@onekeyfe/hd-core/src/device/DeviceStateStore';
import { projectFeatures } from '@onekeyfe/hd-core/src/device/DeviceStateProjector';

jest.mock('@onekeyfe/hd-core/src/data/config', () => ({
  getSDKVersion: () => '1.0.0-test',
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

const constants = Object.values(Long)
  .filter(value => value instanceof Long)
  .map(value => ({ value, low: value.low, high: value.high, unsigned: value.unsigned }));
const resetLong = () => {
  constants.forEach(({ value, low, high, unsigned }) =>
    Object.assign(value, { low, high, unsigned })
  );
};
const collectTypes = namespace => [
  ...(namespace instanceof protobuf.Type ? [namespace] : []),
  ...(namespace.nestedArray || []).flatMap(collectTypes),
];
const capture = fn => {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, name: error.name, message: error.message };
  }
};

function seed(type, mode, depth = 0) {
  const result = {};
  if (depth > 5) return result;
  type.fieldsArray.forEach(field => {
    if (field.partOf && field.partOf.fieldsArray[0] !== field) return;
    if (mode === 'required' && !field.required) return;
    if (field.resolvedType instanceof protobuf.Type && !field.required && depth > 2) return;
    let value;
    if (field.resolvedType instanceof protobuf.Type)
      value = seed(field.resolvedType, mode, depth + 1);
    else if (field.resolvedType instanceof protobuf.Enum) {
      const values = Object.values(field.resolvedType.values);
      value = values[mode === 'values' ? Math.min(1, values.length - 1) : 0];
    } else if (field.type === 'bytes') value = mode === 'values' ? '00ff' : '';
    else if (field.type === 'string') value = mode === 'values' ? 'test-验证' : '';
    else if (field.type === 'bool') value = mode === 'values';
    else if (field.long) value = mode === 'values' ? '9007199254740993' : '0';
    else value = mode === 'values' ? 1 : 0;
    result[field.name] = field.repeated ? [value] : value;
  });
  return result;
}

function inputCases(type) {
  const base = seed(type, 'required');
  const cases = [
    ['absent', {}],
    ['required', base],
    ['zeros', seed(type, 'zeros')],
    ['values', seed(type, 'values')],
  ];
  type.fieldsArray.forEach(field => {
    const add = (label, value) =>
      cases.push([`${field.name}:${label}`, { ...base, [field.name]: value }]);
    const scalar = value => (field.repeated ? [value] : value);
    add('undefined', undefined);
    if (!field.repeated) add('null', null);
    let values = [];
    if (field.resolvedType instanceof protobuf.Enum) {
      values = [
        ...Object.entries(field.resolvedType.values).flat(),
        -1,
        2147483647,
        '0',
        'UNKNOWN_ENUM',
      ];
    } else if (!field.resolvedType) {
      if (field.type === 'bytes')
        values = ['', '00', '0', 'zz', Buffer.alloc(0), new Uint8Array([0, 255])];
      else if (field.type === 'string') values = [0, 1, false, '', '01'];
      else if (field.type === 'bool') values = [false, true, 0, 1, 'false', 'true'];
      else if (field.long)
        values = [
          '0',
          '9007199254740991',
          '9007199254740993',
          '18446744073709551615',
          '-9223372036854775808',
          9007199254740992,
        ];
      else values = [0, -1, 1, '0', '1', '01', 1.5, NaN, Infinity];
    }
    values.forEach((value, index) => add(`coercion-${index}`, scalar(value)));
    if (field.repeated) add('empty-array', []);
    if (field.repeated && field.type === 'bytes') add('three-empty-bytes', ['', '', '']);
  });
  return cases;
}

// Do not print inputs or wire bytes on failures, even though all data here is synthetic.
function compare(label, oldCall, newCall, reset = true) {
  if (reset) resetLong();
  const expected = capture(oldCall);
  if (reset) resetLong();
  const actual = capture(newCall);
  if (!isDeepStrictEqual(expected, actual)) throw new Error(`Static protobuf differs: ${label}`);
  return expected;
}

const toBytes = (type, input) => Buffer.from(encode(type, input).toBuffer());
const fromBytes = (type, bytes) => decode(type, ByteBuffer.wrap(bytes));

afterEach(() => {
  resetLong();
  jest.restoreAllMocks();
});

test.each([
  ['v1', v1],
  ['legacy-v1', legacy],
  ['v2', v2],
])(
  '%s matches legacy bytes, own properties, scalar types, malformed input and framing',
  (schemaName, schema) => {
    const reference = protobuf.Root.fromJSON(schema);
    const types = collectTypes(reference);
    types.forEach(type => {
      type.setup();
      type.create();
    });
    // Baseline functions are ready. Every candidate constructor and codec must now be static.
    jest.spyOn(protobuf.Type.prototype, 'setup').mockImplementation(() => {
      throw new Error('Dynamic setup');
    });
    jest.spyOn(protobuf.Type, 'generateConstructor').mockImplementation(() => {
      throw new Error('Dynamic constructor');
    });
    const candidate = parseConfigure(schema);
    const stringCandidate = parseConfigure(JSON.stringify(schema));
    expect(collectTypes(candidate)).toHaveLength(types.length);
    let inputs = 0;
    let wires = 0;
    let frames = 0;
    const rows = [];
    types.forEach(type => {
      const next = candidate.lookupType(type.fullName);
      rows.push({ message: type.fullName, result: 'equal', inputs: inputCases(type).length });
      inputCases(type).forEach(([label, input]) => {
        const encoded = compare(
          `${schemaName}/${type.name}/${label}/encode`,
          () => toBytes(type, input),
          () => toBytes(next, input)
        );
        inputs += 1;
        if (encoded.ok) {
          compare(
            `${schemaName}/${type.name}/${label}/decode`,
            () => fromBytes(type, encoded.value),
            () => fromBytes(next, encoded.value)
          );
          wires += 1;
        }
      });
      const base = capture(() => toBytes(type, seed(type, 'required')));
      if (!base.ok) return;
      const checkWire = (label, bytes) => {
        compare(
          `${schemaName}/${type.name}/${label}`,
          () => fromBytes(type, bytes),
          () => fromBytes(next, bytes)
        );
        wires += 1;
      };
      checkWire('empty-wire', Buffer.alloc(0));
      const dense = capture(() => toBytes(type, seed(type, 'values')));
      if (dense.ok) {
        [0, 1, Math.floor(dense.value.length / 2), dense.value.length - 1]
          .filter(length => length >= 0)
          .forEach(length => checkWire(`truncated-${length}`, dense.value.subarray(0, length)));
        for (let index = 0; index < Math.min(12, dense.value.length); index += 1) {
          const bytes = Buffer.from(dense.value);
          bytes[index] = (bytes[index] + 2 ** (index % 8)) % 256;
          checkWire(`mutation-${index}`, bytes);
        }
      }
      const tail = protobuf.Writer.create()
        .uint32(500000 * 8)
        .finish();
      checkWire('battery-ff-fallback', Buffer.concat([base.value, tail, Buffer.from([255])]));
      checkWire(
        'unknown-field',
        Buffer.concat([
          base.value,
          protobuf.Writer.create()
            .uint32(500000 * 8 + 2)
            .bytes([0, 255, 1])
            .finish(),
        ])
      );
      type.fieldsArray.forEach(field => {
        if (field.resolvedType instanceof protobuf.Enum) {
          const known = Object.values(field.resolvedType.values)[0];
          [-1, 2147483647].forEach(unknown => {
            const write = value =>
              protobuf.Writer.create()
                .uint32(field.id * 8)
                .int32(value)
                .finish();
            checkWire(`${field.name}/unknown`, Buffer.concat([base.value, write(unknown)]));
            checkWire(
              `${field.name}/mixed`,
              Buffer.concat([base.value, write(known), write(unknown), write(known)])
            );
            if (field.repeated) {
              const packed = protobuf.Writer.create()
                .int32(known)
                .int32(unknown)
                .int32(known)
                .finish();
              checkWire(
                `${field.name}/packed-mixed`,
                Buffer.concat([
                  base.value,
                  protobuf.Writer.create()
                    .uint32(field.id * 8 + 2)
                    .bytes(packed)
                    .finish(),
                ])
              );
            }
          });
        } else if (field.resolvedType instanceof protobuf.Type && !field.repeated) {
          const first = capture(() =>
            toBytes(field.resolvedType, seed(field.resolvedType, 'values'))
          );
          const second = capture(() =>
            toBytes(field.resolvedType, seed(field.resolvedType, 'required'))
          );
          if (first.ok && second.ok) {
            const wrap = bytes =>
              protobuf.Writer.create()
                .uint32(field.id * 8 + 2)
                .bytes(bytes)
                .finish();
            checkWire(
              `${field.name}/duplicate-message`,
              Buffer.concat([base.value, wrap(first.value), wrap(second.value)])
            );
          }
        }
      });
      const name = type.fullName.slice(1);
      const message = capture(() => createMessageFromName(reference, name));
      if (message.ok) {
        const input = seed(type, 'values');
        compare(
          `${name}/id`,
          () => message.value.messageTypeId,
          () => createMessageFromName(candidate, name).messageTypeId
        );
        compare(
          `${name}/v1-envelope`,
          () => ProtocolV1.encodeEnvelope(reference, name, input).toBuffer(),
          () => ProtocolV1.encodeEnvelope(candidate, name, input).toBuffer()
        );
        compare(
          `${name}/v1-chunks`,
          () => ProtocolV1.encodeMessageChunks(reference, name, input),
          () => ProtocolV1.encodeMessageChunks(candidate, name, input)
        );
        if (schemaName === 'v2') {
          compare(
            `${name}/v2-frame`,
            () =>
              ProtocolV2.encodeFrame(
                { protocolV1: reference, protocolV2: reference },
                name,
                input,
                { seq: 23 }
              ),
            () =>
              ProtocolV2.encodeFrame(
                { protocolV1: candidate, protocolV2: candidate },
                name,
                input,
                { seq: 23 }
              )
          );
        }
        frames += 1;
      }
      compare(
        `${name}/string-config`,
        () => toBytes(next, seed(type, 'required')),
        () => toBytes(stringCandidate.lookupType(type.fullName), seed(type, 'required'))
      );
    });
    const reportDirectory = path.resolve(__dirname, '../../../node_modules/.cache/protobuf-static');
    mkdirSync(reportDirectory, { recursive: true });
    writeFileSync(
      path.join(reportDirectory, `${schemaName}.json`),
      JSON.stringify({ schemaName, inputs, wires, frames, rows }, null, 2)
    );
    console.info(
      `Static protobuf ${schemaName}: ${types.length} messages, ${inputs} inputs, ${wires} decodes, ${frames} message envelopes; zero differences`
    );
  },
  120000
);

test('custom schemas retain reflection support instead of selecting a similar built-in message', () => {
  const schema = { nested: { Features: { fields: { custom: { type: 'string', id: 1 } } } } };
  const root = parseConfigure(schema);
  expect(installStaticCodecs(root)).toBe(false);
  expect(
    fromBytes(root.lookupType('Features'), toBytes(root.lookupType('Features'), { custom: 'test' }))
  ).toStrictEqual({ custom: 'test' });
});

test.each([
  ['v1', v1],
  ['legacy-v1', legacy],
  ['v2', v2],
])(
  '%s preserves Features compatibility patches, state and projected own properties',
  (schemaName, schema) => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const reference = protobuf.Root.fromJSON(schema).resolveAll();
    const candidate = parseConfigure(schema);
    const names = schemaName === 'v2' ? ['Features', 'DeviceInfo', 'DeviceStatus'] : ['Features'];
    let comparisons = 0;
    names.forEach(name => {
      const type = reference.lookupType(name);
      const next = candidate.lookupType(name);
      const pipeline = (decoded, cached, mode) => {
        let payload = decoded;
        let mapped;
        if (name === 'Features') {
          const patched = patchFeatures({ type: name, message: decoded }).message;
          payload = buildProtocolV1FeaturesPayload(patched, cached?.previous);
          payload.unlocked = payload.unlocked ?? true;
          payload = fixFeaturesFirmwareVersion(payload);
          mapped = mapFeaturesToState(payload);
        } else {
          mapped =
            name === 'DeviceInfo'
              ? mapProtocolV2DeviceInfoToState(decoded, mode)
              : mapProtocolV2DeviceStatusToState(decoded);
        }
        const store = new DeviceStateStore(cached?.state);
        const updated = store.update(mapped, 'initialize');
        return { payload, mapped, ...updated, projected: projectFeatures(updated.state) };
      };
      const dense = toBytes(type, seed(type, 'values'));
      const initial = pipeline(fromBytes(type, dense), undefined, 'normal');
      const cache = { state: initial.state, previous: initial.projected };
      const cases = inputCases(type);
      const populated = seed(type, 'values');
      type.fieldsArray.forEach(field => {
        const omitted = { ...populated };
        delete omitted[field.name];
        cases.push([`${field.name}/omitted`, omitted]);
      });
      cases.forEach(([label, input]) => {
        const encoded = capture(() => toBytes(type, input));
        if (!encoded.ok) return;
        [undefined, cache].forEach(cached => {
          ['normal', 'bootloader'].forEach(mode => {
            compare(
              `${schemaName}/${name}/${label}/pipeline/${mode}/${!!cached}`,
              () => pipeline(fromBytes(type, encoded.value), cached, mode),
              () => pipeline(fromBytes(next, encoded.value), cached, mode)
            );
            comparisons += 1;
          });
        });
      });
    });
    console.info(
      `Static protobuf ${schemaName}: ${comparisons} Features pipeline comparisons; zero differences`
    );
  }
);

test('retains sequence-dependent Long conversion behavior', () => {
  const reference = protobuf.Root.fromJSON(v2).resolveAll();
  const candidate = parseConfigure(v2);
  const signed = reference.lookupType('CardanoToken');
  const unsigned = collectTypes(reference).find(type =>
    type.fieldsArray.some(field => field.type === 'uint64' && !field.repeated)
  );
  const field = unsigned.fieldsArray.find(item => item.type === 'uint64' && !item.repeated);
  const bytes = toBytes(signed, {
    ...seed(signed, 'required'),
    mint_amount: '-9223372036854775808',
  });
  const sequence = root => {
    resetLong();
    const before = capture(() => fromBytes(root.lookupType(signed.fullName), bytes));
    const encoded = capture(() =>
      toBytes(root.lookupType(unsigned.fullName), {
        ...seed(unsigned, 'required'),
        [field.name]: '-9223372036854775808',
      })
    );
    const after = capture(() => fromBytes(root.lookupType(signed.fullName), bytes));
    return { before, encoded, after };
  };
  compare(
    'Long mutation sequence',
    () => sequence(reference),
    () => sequence(candidate)
  );
});
