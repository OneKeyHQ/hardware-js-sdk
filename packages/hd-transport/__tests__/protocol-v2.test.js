const { ProtocolV2 } = require('../src/protocols');
const { parseConfigure } = require('../src/serialization/protobuf/messages');
const sessionModule = require('../src/protocols/v2/session');

const { ProtocolV2FrameAssembler, ProtocolV2Session, probeProtocolV2 } = sessionModule;
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
    Failure: {
      fields: {
        code: {
          type: 'uint32',
          id: 1,
        },
        message: {
          type: 'string',
          id: 2,
        },
      },
    },
    ButtonRequest: {
      fields: {
        code: {
          type: 'uint32',
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
        MessageType_Failure: 3,
        MessageType_ButtonRequest: 26,
        MessageType_OnekeyGetFeatures: 10025,
        MessageType_OnekeyFeatures: 10026,
      },
    },
  },
});

const protocolV2Messages = parseConfigure({
  nested: {
    ProtocolInfoRequest: {
      fields: {},
    },
    ProtocolInfo: {
      fields: {
        version: {
          type: 'uint32',
          id: 1,
        },
        supported_messages: {
          type: 'uint32',
          id: 2,
          rule: 'repeated',
        },
        protobuf_definition: {
          type: 'string',
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
    DeviceFirmwareTarget: {
      fields: {
        target_id: {
          type: 'uint32',
          id: 1,
        },
        path: {
          type: 'string',
          id: 2,
        },
      },
    },
    DeviceFirmwareUpdateRequest: {
      fields: {
        targets: {
          type: 'DeviceFirmwareTarget',
          id: 1,
          rule: 'repeated',
        },
      },
    },
    DeviceFirmwareUpdateRecord: {
      fields: {
        target_id: {
          type: 'uint32',
          id: 1,
        },
        status: {
          type: 'uint32',
          id: 10,
        },
        payload_version: {
          type: 'uint32',
          id: 20,
        },
        path: {
          type: 'string',
          id: 30,
        },
      },
    },
    DeviceFirmwareUpdateStatus: {
      fields: {
        records: {
          type: 'DeviceFirmwareUpdateRecord',
          id: 1,
          rule: 'repeated',
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
        MessageType_ProtocolInfoRequest: 60200,
        MessageType_ProtocolInfo: 60201,
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
        MessageType_FileWrite: 60805,
        MessageType_DeviceFirmwareUpdateRequest: 61000,
        MessageType_DeviceFirmwareUpdateStatus: 61002,
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
    const frame = ProtocolV2.encodeFrame(schemas, 'ProtocolInfo', {
      version: 1,
      supported_messages: [60200, 60201],
      protobuf_definition: 'proto',
    });

    const parsed = protocolV2.decodeFrame(frame);
    expect(parsed.messageTypeId).toBe(60201);

    const decoded = ProtocolV2.decodeFrame(schemas, frame);
    expect(decoded).toEqual({
      type: 'ProtocolInfo',
      messageName: 'ProtocolInfo',
      messageTypeId: 60201,
      pbPayload: parsed.pbPayload,
      seq: parsed.seq,
      message: {
        version: 1,
        supported_messages: [60200, 60201],
        protobuf_definition: 'proto',
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
    const frame = ProtocolV2.encodeFrame(schemas, 'ProtocolInfo', {
      version: 1,
      supported_messages: [],
    });
    const assembler = new ProtocolV2FrameAssembler();

    expect(assembler.push(frame.slice(0, 4))).toBeUndefined();
    expect(assembler.push(frame.slice(4))).toEqual(frame);

    const oversized = new Uint8Array([0x5a, 0xff, 0xff]);
    expect(() => assembler.push(oversized)).toThrow('Protocol V2 frame too large');
  });

  test('keeps bytes after the first complete frame for the next read', () => {
    const first = ProtocolV2.encodeFrame(schemas, 'ProtocolInfo', {
      version: 1,
      supported_messages: [],
    });
    const second = ProtocolV2.encodeFrame(schemas, 'ProtocolInfo', {
      version: 2,
      supported_messages: [],
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
    const response = ProtocolV2.encodeFrame(schemas, 'ProtocolInfo', {
      version: 2,
      supported_messages: [60206],
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

    const result = await session.call('ProtocolInfoRequest', {});

    expect(written).toHaveLength(1);
    expect(written[0][4]).toBe(1);
    expect(written[0][5]).toBe(0);
    expect(protocolV2.decodeFrame(written[0]).messageTypeId).toBe(60200);
    expect(result).toEqual({
      type: 'ProtocolInfo',
      message: {
        version: 2,
        supported_messages: [60206],
        protobuf_definition: null,
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
      writeFrame: () =>
        new Promise(resolve => {
          setTimeout(resolve, 30);
        }),
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
    const response = ProtocolV2.encodeFrame(schemas, 'ProtocolInfo', {
      version: 2,
      supported_messages: [],
    });
    const logger = {
      debug: jest.fn(),
    };
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: () => Promise.resolve(),
      readFrame: () => Promise.resolve(rewriteSeq(response, 200)),
      logger,
    });

    await expect(session.call('ProtocolInfoRequest', {})).resolves.toEqual({
      type: 'ProtocolInfo',
      message: {
        version: 2,
        supported_messages: [],
        protobuf_definition: null,
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
    const response = ProtocolV2.encodeFrame(schemas, 'ProtocolInfo', {
      version: 2,
      supported_messages: [],
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
      session.call('ProtocolInfoRequest', {}, { expectedTypes: ['ProtocolInfo'] })
    ).resolves.toEqual({
      type: 'ProtocolInfo',
      message: {
        version: 2,
        supported_messages: [],
        protobuf_definition: null,
      },
    });

    expect(readFrame).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('skip unexpected response'));
  });

  test('session consumes intermediate response frames before returning the final response', async () => {
    const written = [];
    const progress = ProtocolV2.encodeFrame(schemas, 'DeviceFirmwareUpdateStatus', {
      records: [{ target_id: 3, status: 1 }],
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
      'DeviceFirmwareUpdateRequest',
      { targets: [{ target_id: 3, path: 'vol1:firmware.bin' }] },
      {
        intermediateTypes: ['DeviceFirmwareUpdateStatus'],
        onIntermediateResponse,
      }
    );

    expect(readFrame).toHaveBeenCalledTimes(2);
    expect(onIntermediateResponse).toHaveBeenCalledWith({
      type: 'DeviceFirmwareUpdateStatus',
      message: {
        records: [{ target_id: 3, status: 1, payload_version: null, path: null }],
      },
    });
    expect(result).toEqual({
      type: 'Success',
      message: {
        message: 'ok',
      },
    });
  });

  test('probeProtocolV2 accepts Success as a normal V2 probe response', async () => {
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

  test('decodeFrame rejects frames that are too short', () => {
    expect(() => protocolV2.decodeFrame(new Uint8Array([0x5a, 0x08, 0x00]))).toThrow(
      'Protocol V2 frame too short'
    );
  });

  test('decodeFrame rejects frames with an invalid SOF byte', () => {
    const frame = ProtocolV2.encodeFrame(schemas, 'Success', { message: 'ok' });
    const corrupted = new Uint8Array(frame);
    corrupted[0] = 0x00;
    expect(() => protocolV2.decodeFrame(corrupted)).toThrow('Invalid SOF byte');
  });

  test('decodeFrame rejects frames with a header CRC mismatch', () => {
    const frame = ProtocolV2.encodeFrame(schemas, 'Success', { message: 'ok' });
    const corrupted = new Uint8Array(frame);
    corrupted[3] = (corrupted[3] + 1) % 256;
    expect(() => protocolV2.decodeFrame(corrupted)).toThrow('Header CRC mismatch');
  });

  test('decodeFrame rejects frames with a frame CRC mismatch', () => {
    const frame = ProtocolV2.encodeFrame(schemas, 'Success', { message: 'ok' });
    const corrupted = new Uint8Array(frame);
    corrupted[corrupted.length - 1] = (corrupted[corrupted.length - 1] + 1) % 256;
    expect(() => protocolV2.decodeFrame(corrupted)).toThrow('Frame CRC mismatch');
  });

  test('decodeFrame rejects frames whose payload is too short for a messageTypeId', () => {
    // Raw frame with empty payload: 8 bytes of overhead, no messageTypeId.
    const frame = protocolV2.encodeFrame(null);
    expect(() => protocolV2.decodeFrame(frame)).toThrow('payload too short');
  });

  test('session call rejects when no response frame arrives before the timeout', async () => {
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: () => Promise.resolve(),
      readFrame: () => new Promise(() => {}),
    });

    await expect(session.call('Ping', { message: 'x' }, { timeoutMs: 20 })).rejects.toThrow(
      'Protocol V2 response timeout after 20ms for Ping'
    );
  });

  test('session stops the read loop after a timeout instead of consuming later frames', async () => {
    const success = ProtocolV2.encodeFrame(schemas, 'Success', { message: 'late' });
    let resolveRead;
    const readFrame = jest.fn(
      () =>
        new Promise(resolve => {
          resolveRead = resolve;
        })
    );
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: () => Promise.resolve(),
      readFrame,
    });

    await expect(
      session.call('ProtocolInfoRequest', {}, { timeoutMs: 10, expectedTypes: ['ProtocolInfo'] })
    ).rejects.toThrow('Protocol V2 response timeout');

    // Without cancellation the loop would skip this unexpected Success frame
    // and call readFrame again, stealing frames from the next call.
    resolveRead(success);
    await new Promise(resolve => {
      setTimeout(resolve, 20);
    });
    expect(readFrame).toHaveBeenCalledTimes(1);
  });

  test('session serializes concurrent calls so responses cannot be stolen', async () => {
    const events = [];
    const written = [];
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: frame => {
        written.push(frame);
        events.push(`write:${written.length}`);
        return new Promise(resolve => {
          setTimeout(resolve, 10);
        });
      },
      readFrame: () => {
        events.push(`read:${written.length}`);
        const [frame] = written.slice(-1);
        const { seq } = protocolV2.decodeFrame(frame);
        const response =
          written.length === 1
            ? ProtocolV2.encodeFrame(schemas, 'Success', { message: 'first' })
            : ProtocolV2.encodeFrame(schemas, 'Success', { message: 'second' });
        return Promise.resolve(rewriteSeq(response, seq));
      },
    });

    const [first, second] = await Promise.all([
      session.call('Ping', { message: '1' }, { expectedTypes: ['Success'] }),
      session.call('Ping', { message: '2' }, { expectedTypes: ['Success'] }),
    ]);

    expect(first.message).toEqual({ message: 'first' });
    expect(second.message).toEqual({ message: 'second' });
    // The second call must not start writing before the first call finished.
    expect(events).toEqual(['write:1', 'read:1', 'write:2', 'read:2']);
  });

  test('session keeps serving calls after a previous call failed', async () => {
    const response = ProtocolV2.encodeFrame(schemas, 'Success', { message: 'ok' });
    let shouldFail = true;
    const session = new ProtocolV2Session({
      schemas,
      router: 1,
      writeFrame: () => {
        if (shouldFail) {
          shouldFail = false;
          return Promise.reject(new Error('transport write failed'));
        }
        return Promise.resolve();
      },
      readFrame: () => Promise.resolve(response),
    });

    await expect(session.call('Ping', { message: '1' })).rejects.toThrow('transport write failed');
    await expect(session.call('Ping', { message: '2' })).resolves.toEqual({
      type: 'Success',
      message: { message: 'ok' },
    });
  });

  test('session uses a per-session sequence counter starting at 1', async () => {
    const written = [];
    const makeSession = () =>
      new ProtocolV2Session({
        schemas,
        router: 1,
        writeFrame: frame => {
          written.push(frame);
          return Promise.resolve();
        },
        readFrame: () => {
          const [frame] = written.slice(-1);
          const { seq } = protocolV2.decodeFrame(frame);
          return Promise.resolve(
            rewriteSeq(ProtocolV2.encodeFrame(schemas, 'Success', { message: 'ok' }), seq)
          );
        },
      });

    const sessionA = makeSession();
    await sessionA.call('Ping', { message: '1' });
    await sessionA.call('Ping', { message: '2' });
    const sessionB = makeSession();
    await sessionB.call('Ping', { message: '3' });

    expect(written.map(frame => frame[6])).toEqual([1, 2, 1]);
  });

  test('assembler throws and resets on frames with an impossible length field', () => {
    const assembler = new ProtocolV2FrameAssembler();
    // expectedLen = 0 < 8-byte minimum: without the guard this poisons the
    // buffer forever and deadlocks drain loops.
    expect(() => assembler.push(new Uint8Array([0x5a, 0x00, 0x00]))).toThrow(
      'Protocol V2 frame length too small: 0'
    );

    // Buffer must have been reset so the next valid frame goes through.
    const frame = ProtocolV2.encodeFrame(schemas, 'Success', { message: 'ok' });
    expect(assembler.push(frame)).toEqual(frame);
  });

  test('assembler validates the header CRC as soon as 4 bytes arrive', () => {
    const assembler = new ProtocolV2FrameAssembler();
    const header = new Uint8Array([0x5a, 0x10, 0x00, 0x00]);
    header[3] = (protocolV2.crc8(header, 3) + 1) % 256;

    expect(() => assembler.push(header)).toThrow('Protocol V2 header CRC mismatch');

    // Buffer was reset: a valid frame parses afterwards.
    const frame = ProtocolV2.encodeFrame(schemas, 'Success', { message: 'ok' });
    expect(assembler.push(frame)).toEqual(frame);
  });

  test('assembler drain returns every buffered complete frame', () => {
    const first = ProtocolV2.encodeFrame(schemas, 'ProtocolInfo', {
      version: 1,
      supported_messages: [],
    });
    const second = ProtocolV2.encodeFrame(schemas, 'Success', { message: 'ok' });
    const third = ProtocolV2.encodeFrame(schemas, 'Success', { message: 'last' });
    const assembler = new ProtocolV2FrameAssembler();

    const combined = new Uint8Array(first.length + second.length + 3);
    combined.set(first, 0);
    combined.set(second, first.length);
    combined.set(third.slice(0, 3), first.length + second.length);

    expect(assembler.drain(combined)).toEqual([first, second]);
    expect(assembler.drain()).toEqual([]);
    expect(assembler.drain(third.slice(3))).toEqual([third]);
  });

  test('decodes allowlisted legacy V1 interaction messages as a fallback', () => {
    // ButtonRequest only exists in the V1 schema; the V2 decoder should fall
    // back to it because it is on the legacy decode allowlist.
    const frame = protocolV2.encodeProtobufFrame(26, new Uint8Array(0));
    const decoded = ProtocolV2.decodeFrame(schemas, frame);
    expect(decoded.type).toBe('ButtonRequest');
  });

  test('decodes legacy V1 Failure as a Protocol V2 fallback', () => {
    // Some device-side rejection paths still return legacy Failure(type=3)
    // inside a Protocol V2 frame. It must surface as a device Failure, not as
    // a protobuf catalog TypeError.
    const frame = ProtocolV2.encodeFrame(
      { ...schemas, protocolV2: schemas.protocolV1 },
      'Failure',
      {
        code: 1,
        message: 'Action cancelled',
      }
    );
    const decoded = ProtocolV2.decodeFrame(schemas, frame);
    expect(decoded.type).toBe('Failure');
    expect(decoded.message).toEqual({
      code: 1,
      message: 'Action cancelled',
    });
  });

  test('does not fall back to legacy V1 messages outside the allowlist', () => {
    // OnekeyFeatures exists only in the V1 schema and is not allowlisted.
    const frame = protocolV2.encodeProtobufFrame(10026, new Uint8Array(0));
    expect(() => ProtocolV2.decodeFrame(schemas, frame)).toThrow();
  });

  test('hexToBytes converts valid hex and rejects malformed input', () => {
    const { hexToBytes } = sessionModule;
    expect(hexToBytes('5a0102')).toEqual(new Uint8Array([0x5a, 0x01, 0x02]));
    expect(hexToBytes('')).toEqual(new Uint8Array(0));
    expect(() => hexToBytes('abc')).toThrow('Invalid hex string: odd length');
    expect(() => hexToBytes('zz')).toThrow('contains non-hex characters');
  });

  test('probeProtocolV2 only uses Ping for acquire probing', async () => {
    const call = jest.fn().mockRejectedValue(new Error('Ping timeout'));
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
      { message: 'protocol-v2-probe' },
      {
        timeoutMs: 1,
        expectedTypes: ['Success'],
      }
    );
    expect(call).toHaveBeenCalledTimes(1);
    expect(onProbeFailed).toHaveBeenCalledWith(expect.any(Error));
  });
});
