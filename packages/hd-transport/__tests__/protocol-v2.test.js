const { ProtocolV2 } = require('../src/protocols');
const { parseConfigure } = require('../src/serialization/protobuf/messages');
const {
  ProtocolV2FrameAssembler,
  ProtocolV2Session,
  probeProtocolV2,
} = require('../src/protocols/v2/session');
const protocolV2 = require('../src/protocols/v2');

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
    OnekeyGetFeatures: {
      fields: {},
    },
    OnekeyFeatures: {
      fields: {},
    },
    MessageType: {
      values: {
        MessageType_Success: 2,
        MessageType_OnekeyGetFeatures: 10025,
        MessageType_OnekeyFeatures: 10026,
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
    Success: {
      fields: {
        message: {
          type: 'string',
          id: 1,
        },
      },
    },
    DevFirmwareUpdate: {
      fields: {},
    },
    DevFirmwareInstallProgress: {
      fields: {
        target_id: {
          type: 'uint32',
          id: 1,
        },
        progress: {
          type: 'uint32',
          id: 2,
        },
      },
    },
    FileWrite: {
      fields: {},
    },
    PartialNested: {
      fields: {
        child: {
          type: 'NestedChild',
          id: 1,
        },
        label: {
          type: 'string',
          id: 2,
        },
      },
    },
    NestedChild: {
      fields: {
        value: {
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
        MessageType_Success: 60207,
        MessageType_FileWrite: 60805,
        MessageType_DevFirmwareUpdate: 61000,
        MessageType_DevFirmwareInstallProgress: 61001,
        MessageType_PartialNested: 62000,
      },
    },
  },
});

const schemas = {
  protocolV1: protocolV1Messages,
  protocolV2: protocolV2Messages,
};

const rewriteSeq = (frame, seq) => {
  const copy = new Uint8Array(frame);
  copy[6] = seq;
  copy[copy.length - 1] = protocolV2.crc8(copy, copy.length - 1);
  return copy;
};

describe('Protocol V2 framing and session', () => {
  test('encodes and decodes Protocol V2 protobuf frames', () => {
    const frame = ProtocolV2.encodeFrame(schemas, 'ProtoVersion', {
      major_version: 1,
      minor_version: 2,
      patch_version: 3,
    });

    const parsed = protocolV2.decodeFrame(frame);
    expect(parsed.messageTypeId).toBe(60201);

    const decoded = ProtocolV2.decodeFrame(schemas, frame);
    expect(decoded).toEqual({
      type: 'ProtoVersion',
      messageName: 'ProtoVersion',
      messageTypeId: 60201,
      pbPayload: parsed.pbPayload,
      seq: parsed.seq,
      message: {
        major_version: 1,
        minor_version: 2,
        patch_version: 3,
      },
    });
  });

  test('does not encode V1-only messages into Protocol V2 frames', () => {
    expect(() => ProtocolV2.encodeFrame(schemas, 'Ping', { message: 'ok' })).not.toThrow();
    expect(() => ProtocolV2.encodeFrame(schemas, 'OnekeyGetFeatures', {})).toThrow(
      'Protocol V2 message "OnekeyGetFeatures" is not defined'
    );
  });

  test('decodes Protocol V2 frames with the Protocol V2 catalog first', () => {
    const frame = ProtocolV2.encodeFrame(schemas, 'Success', {
      message: 'ok',
    });

    const parsed = protocolV2.decodeFrame(frame);
    expect(parsed.messageTypeId).toBe(60207);

    const decoded = ProtocolV2.decodeFrame(schemas, frame);
    expect(decoded.type).toBe('Success');
    expect(decoded.message).toEqual({ message: 'ok' });
  });

  test('decodes missing optional nested messages as null', () => {
    const frame = ProtocolV2.encodeFrame(schemas, 'PartialNested', {
      label: 'only label',
    });

    const decoded = ProtocolV2.decodeFrame(schemas, frame);
    expect(decoded.message).toEqual({
      child: null,
      label: 'only label',
    });
  });

  test('reassembles split Protocol V2 frames and rejects oversized frames', () => {
    const frame = ProtocolV2.encodeFrame(schemas, 'ProtoVersion', {
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

  test('keeps bytes after the first complete frame for the next read', () => {
    const first = ProtocolV2.encodeFrame(schemas, 'ProtoVersion', {
      major_version: 1,
      minor_version: 0,
      patch_version: 0,
    });
    const second = ProtocolV2.encodeFrame(schemas, 'ProtoVersion', {
      major_version: 2,
      minor_version: 0,
      patch_version: 0,
    });
    const assembler = new ProtocolV2FrameAssembler();
    const combined = new Uint8Array(first.length + second.length);
    combined.set(first, 0);
    combined.set(second, first.length);

    expect(assembler.push(combined)).toEqual(first);
    expect(assembler.push(new Uint8Array(0))).toEqual(second);
  });

  test('session writes one encoded frame and decodes the response frame', async () => {
    const written = [];
    const response = ProtocolV2.encodeFrame(schemas, 'ProtoVersion', {
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
      readFrame: () =>
        Promise.resolve(rewriteSeq(response, protocolV2.decodeFrame(written[0]).seq)),
    });

    const result = await session.call('GetProtoVersion', {});

    expect(written).toHaveLength(1);
    expect(written[0][4]).toBe(1);
    expect(written[0][5]).toBe(0);
    expect(protocolV2.decodeFrame(written[0]).messageTypeId).toBe(60200);
    expect(result).toEqual({
      type: 'ProtoVersion',
      message: {
        major_version: 2,
        minor_version: 0,
        patch_version: 1,
      },
    });
  });

  test('session starts response timeout after the frame is written', async () => {
    const response = ProtocolV2.encodeFrame(schemas, 'Success', {
      message: 'ok',
    });
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: () => new Promise(resolve => setTimeout(resolve, 30)),
      readFrame: () => Promise.resolve(response),
    });

    await expect(
      session.call('Ping', { message: 'hello' }, { timeoutMs: 10, expectedTypes: ['Success'] })
    ).resolves.toEqual({
      type: 'Success',
      message: {
        message: 'ok',
      },
    });
  });

  test('session accepts response frames with a device-owned seq', async () => {
    const response = ProtocolV2.encodeFrame(schemas, 'ProtoVersion', {
      major_version: 2,
      minor_version: 0,
      patch_version: 1,
    });
    const logger = {
      debug: jest.fn(),
    };
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: () => Promise.resolve(),
      readFrame: () => Promise.resolve(response),
      logger,
    });

    await expect(session.call('GetProtoVersion', {})).resolves.toEqual({
      type: 'ProtoVersion',
      message: {
        major_version: 2,
        minor_version: 0,
        patch_version: 1,
      },
    });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('seq differs'));
  });

  test('session logs decoded transmit and receive payloads', async () => {
    const response = ProtocolV2.encodeFrame(schemas, 'Success', {
      message: 'accepted',
    });
    const logger = {
      debug: jest.fn(),
    };
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: () => Promise.resolve(),
      readFrame: () => Promise.resolve(response),
      logger,
      logPrefix: 'ProtocolV2 Test',
    });

    await expect(session.call('Ping', { message: 'hello' })).resolves.toEqual({
      type: 'Success',
      message: {
        message: 'accepted',
      },
    });

    expect(logger.debug).toHaveBeenCalledWith('[ProtocolV2 Test] TX payload name=Ping', {
      message: 'hello',
    });
    expect(logger.debug).toHaveBeenCalledWith(
      '[ProtocolV2 Test] encode raw frame',
      expect.objectContaining({
        context: 'tx:Ping',
        messageTypeId: 60206,
        router: 1,
      })
    );
    expect(logger.debug).toHaveBeenCalledWith(
      '[ProtocolV2 Test] decode raw frame',
      expect.objectContaining({
        context: 'rx:Ping',
        messageTypeId: 60207,
      })
    );
    expect(logger.debug).toHaveBeenCalledWith(
      '[ProtocolV2 Test] RX payload type=Success messageTypeId=60207',
      {
        message: 'accepted',
      }
    );
  });

  test('session suppresses debug logs for file transfer calls', async () => {
    const response = ProtocolV2.encodeFrame(schemas, 'Success', {
      message: 'ok',
    });
    const logger = {
      debug: jest.fn(),
    };
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: () => Promise.resolve(),
      readFrame: () => Promise.resolve(response),
      logger,
    });

    await expect(session.call('FileWrite', {})).resolves.toEqual({
      type: 'Success',
      message: {
        message: 'ok',
      },
    });

    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('session skips unrelated terminal frames when expected response types are provided', async () => {
    const stale = ProtocolV2.encodeFrame(schemas, 'Success', {
      message: 'stale response',
    });
    const response = ProtocolV2.encodeFrame(schemas, 'ProtoVersion', {
      major_version: 2,
      minor_version: 0,
      patch_version: 1,
    });
    const logger = {
      debug: jest.fn(),
    };
    const readFrame = jest.fn().mockResolvedValueOnce(stale).mockResolvedValueOnce(response);
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: () => Promise.resolve(),
      readFrame,
      logger,
    });

    await expect(
      session.call('GetProtoVersion', {}, { expectedTypes: ['ProtoVersion'] })
    ).resolves.toEqual({
      type: 'ProtoVersion',
      message: {
        major_version: 2,
        minor_version: 0,
        patch_version: 1,
      },
    });

    expect(readFrame).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('skip unexpected response'));
  });

  test('session consumes intermediate response frames before returning the final response', async () => {
    const written = [];
    const progress = ProtocolV2.encodeFrame(schemas, 'DevFirmwareInstallProgress', {
      target_id: 0,
      progress: 42,
    });
    const success = ProtocolV2.encodeFrame(schemas, 'Success', {
      message: 'ok',
    });
    const onIntermediateResponse = jest.fn();
    const readFrame = jest.fn(() => {
      const [writtenFrame] = written;
      const { seq } = protocolV2.decodeFrame(writtenFrame);
      return Promise.resolve(
        readFrame.mock.calls.length === 1 ? rewriteSeq(progress, seq) : rewriteSeq(success, seq)
      );
    });
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: frame => {
        written.push(frame);
        return Promise.resolve();
      },
      readFrame,
    });

    const result = await session.call(
      'DevFirmwareUpdate',
      {},
      {
        intermediateTypes: ['DevFirmwareInstallProgress'],
        onIntermediateResponse,
      }
    );

    expect(readFrame).toHaveBeenCalledTimes(2);
    expect(onIntermediateResponse).toHaveBeenCalledWith({
      type: 'DevFirmwareInstallProgress',
      message: {
        target_id: 0,
        progress: 42,
      },
    });
    expect(result).toEqual({
      type: 'Success',
      message: {
        message: 'ok',
      },
    });
  });

  test('probeProtocolV2 accepts Ping success as a normal V2 probe response', async () => {
    await expect(
      probeProtocolV2({
        call: () => Promise.resolve({ type: 'Success', message: {} }),
        timeoutMs: 1,
      })
    ).resolves.toBe(true);

    await expect(
      probeProtocolV2({
        call: () => Promise.resolve({ type: 'Failure', message: {} }),
        timeoutMs: 1,
      })
    ).resolves.toBe(false);
  });

  test('probeProtocolV2 only uses Ping for acquire probing', async () => {
    const call = jest.fn().mockRejectedValue(new Error('ping timeout'));
    const onProbeFailed = jest.fn();

    await expect(
      probeProtocolV2({
        call,
        timeoutMs: 1,
        onProbeFailed,
      })
    ).resolves.toBe(false);
    expect(call).toHaveBeenNthCalledWith(
      1,
      'Ping',
      { message: 'probe' },
      {
        timeoutMs: 1,
        expectedTypes: ['Success'],
      }
    );
    expect(call).toHaveBeenCalledTimes(1);
    expect(onProbeFailed).toHaveBeenCalledWith(expect.any(Error));
  });
});
