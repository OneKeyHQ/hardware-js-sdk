const ProtoBuf = require('protobufjs/light');
const ByteBuffer = require('bytebuffer');

const { decode } = require('../src/serialization/protobuf/decode');
const { decode: decodeProtocol } = require('../src/serialization/protocol/decode');

// eslint-disable-next-line import/no-unresolved
const messages = require('../messages.json');

const fixtures = [
  {
    name: 'Features-error-battery_level',
    encodeMessage:
      '0011000000260a096f6e656b65792e736f1002180020002801900101aa010131b00101b80163c00163c020ff',
    out: {
      vendor: 'onekey.so',
      major_version: 2,
      minor_version: 0,
      patch_version: 0,
      bootloader_mode: true,
      firmware_present: true,
      capabilities: [],
      model: '1',
      fw_major: 1,
      fw_minor: 99,
      fw_patch: 99,
      battery_level: 4,
    },
  },
  {
    name: 'Features-success',
    encodeMessage:
      '0011000000260a096f6e656b65792e736f1002180020002801900101aa010131b00102b80163c00163c02004',
    out: {
      vendor: 'onekey.so',
      major_version: 2,
      minor_version: 0,
      patch_version: 0,
      bootloader_mode: true,
      firmware_present: true,
      capabilities: [],
      model: '1',
      fw_major: 2,
      fw_minor: 99,
      fw_patch: 99,
      battery_level: 4,
    },
  },
];

describe('Fix messages decode', () => {
  const Messages = ProtoBuf.Root.fromJSON(messages);
  const Message = Messages.lookup(`Features`);
  fixtures.forEach(f => {
    describe(f.name, () => {
      test('decode', () => {
        // deserialize
        const encoded = ByteBuffer.fromHex(f.encodeMessage);
        const { buffer } = decodeProtocol(encoded);
        const decoded = decode(Message, buffer);

        // filter null values
        Object.keys(decoded).forEach(key => {
          if (decoded[key] == null) {
            delete decoded[key];
          }
        });
        expect(decoded).toEqual(f.out);
      });
    });
  });
});
