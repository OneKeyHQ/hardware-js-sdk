const { ProtocolV2 } = require('../src/serialization/protocols');
const { parseConfigure } = require('../src/serialization/protobuf/messages');
const {
  ProtocolV2FrameAssembler,
  ProtocolV2Session,
  probeProtocolV2,
} = require('../src/protocol-session');
const protoV2 = require('../src/serialization/protocol-v2');

const protocolV1Messages = parseConfigure({
  nested: {
    Success: {
      fields: {
        message: {
          type: 'string',
          id: 1,
        },
      },
    },
    MessageType: {
      values: {
        MessageType_Success: 2,
      },
    },
  },
});

const protocolV2Messages = parseConfigure({
  nested: {
    GetProtoVersion: {
      fields: {},
    },
    ProtoVersion: {
      fields: {
        major_version: {
          type: 'uint32',
          id: 1,
        },
        minor_version: {
          type: 'uint32',
          id: 2,
        },
        patch_version: {
          type: 'uint32',
          id: 3,
        },
      },
    },
    Ping: {
      fields: {
        message: {
          type: 'string',
          id: 1,
        },
      },
    },
    MessageType: {
      values: {
        MessageType_GetProtoVersion: 60200,
        MessageType_ProtoVersion: 60201,
        MessageType_Ping: 60206,
      },
    },
  },
});

const schemas = {
  protocolV1: protocolV1Messages,
  protocolV2: protocolV2Messages,
};

describe('Protocol V2 framing and session', () => {
  test('encodes and decodes Protocol V2 protobuf frames', () => {
    const frame = ProtocolV2.encode(schemas, 'ProtoVersion', {
      major_version: 1,
      minor_version: 2,
      patch_version: 3,
    });

    const parsed = protoV2.parseProtoV2Frame(frame);
    expect(parsed.msgType).toBe(60201);

    const decoded = ProtocolV2.decode(schemas, frame);
    expect(decoded).toEqual({
      type: 'ProtoVersion',
      messageName: 'ProtoVersion',
      msgType: 60201,
      pbPayload: parsed.pbPayload,
      message: {
        major_version: 1,
        minor_version: 2,
        patch_version: 3,
      },
    });
  });

  test('uses V1 schema fallback when a V2 frame carries a V1 message type', () => {
    const frame = ProtocolV2.encode(schemas, 'Success', {
      message: 'ok',
    });

    const parsed = protoV2.parseProtoV2Frame(frame);
    expect(parsed.msgType).toBe(2);

    const decoded = ProtocolV2.decode(schemas, frame);
    expect(decoded.type).toBe('Success');
    expect(decoded.message).toEqual({ message: 'ok' });
  });

  test('reassembles split Protocol V2 frames and rejects oversized frames', () => {
    const frame = ProtocolV2.encode(schemas, 'ProtoVersion', {
      major_version: 1,
      minor_version: 0,
      patch_version: 0,
    });
    const assembler = new ProtocolV2FrameAssembler();

    expect(assembler.push(frame.slice(0, 4))).toBeUndefined();
    expect(assembler.push(frame.slice(4))).toEqual(frame);

    const oversized = new Uint8Array([0x5a, 0xff, 0xff]);
    expect(() => assembler.push(oversized)).toThrow('Protocol V2 frame too large');
  });

  test('session writes one encoded frame and decodes the response frame', async () => {
    const written = [];
    const response = ProtocolV2.encode(schemas, 'ProtoVersion', {
      major_version: 2,
      minor_version: 0,
      patch_version: 1,
    });
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: frame => {
        written.push(frame);
        return Promise.resolve();
      },
      readFrame: () => Promise.resolve(response),
    });

    const result = await session.call('GetProtoVersion', {});

    expect(written).toHaveLength(1);
    expect(protoV2.parseProtoV2Frame(written[0]).msgType).toBe(60200);
    expect(result).toEqual({
      type: 'ProtoVersion',
      message: {
        major_version: 2,
        minor_version: 0,
        patch_version: 1,
      },
    });
  });

  test('probeProtocolV2 returns true only for ProtoVersion responses', async () => {
    await expect(
      probeProtocolV2({
        call: () => Promise.resolve({ type: 'ProtoVersion', message: {} }),
        timeoutMs: 1,
      })
    ).resolves.toBe(true);

    await expect(
      probeProtocolV2({
        call: () => Promise.resolve({ type: 'Success', message: {} }),
        timeoutMs: 1,
      })
    ).resolves.toBe(false);
  });
});
