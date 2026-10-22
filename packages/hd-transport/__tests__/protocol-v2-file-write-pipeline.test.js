/* eslint-disable @typescript-eslint/no-var-requires */
const { ProtocolV2, ProtocolV2LinkManager } = require('../src');
const { parseConfigure } = require('../src/serialization/protobuf/messages');
const { ProtocolV2Session } = require('../src/protocols/v2/session');
const protocolV2 = require('../src/protocols/v2');
const { PROTOCOL_V2_FILE_WRITE_PIPELINE_WINDOW } = require('../src/constants');

const schemas = {
  protocolV1: parseConfigure({
    nested: {
      Failure: { fields: { code: { type: 'uint32', id: 1 }, message: { type: 'string', id: 2 } } },
      MessageType: { values: { MessageType_Failure: 3 } },
    },
  }),
  protocolV2: parseConfigure({
    nested: {
      Failure: {
        fields: {
          code: { type: 'uint32', id: 1 },
          subcode: { type: 'uint32', id: 2 },
          message: { type: 'string', id: 3 },
        },
      },
      ButtonRequest: { fields: { code: { type: 'uint32', id: 1 } } },
      Success: { fields: { message: { type: 'string', id: 1 } } },
      FilesystemFile: {
        fields: {
          path: { type: 'string', id: 1 },
          offset: { type: 'uint32', id: 2 },
          total_size: { type: 'uint32', id: 3 },
          data: { type: 'bytes', id: 4 },
          processed_byte: { type: 'uint32', id: 6 },
        },
      },
      FilesystemFileWrite: {
        fields: {
          file: { type: 'FilesystemFile', id: 1 },
          overwrite: { type: 'bool', id: 2 },
          append: { type: 'bool', id: 3 },
        },
      },
      MessageType: {
        values: {
          MessageType_Success: 60207,
          MessageType_Failure: 60208,
          MessageType_ButtonRequest: 60209,
          MessageType_FilesystemFile: 60803,
          MessageType_FilesystemFileWrite: 60805,
        },
      },
    },
  }),
};

const PATH = 'vol0:/application_p1.bin';

const chunk = (offset, length, totalSize) => ({
  file: { path: PATH, offset, total_size: totalSize, data: new Uint8Array(length) },
  overwrite: offset === 0,
  append: false,
});

const chunksOf = (totalSize, chunkSize) => {
  const chunks = [];
  for (let offset = 0; offset < totalSize; offset += chunkSize) {
    chunks.push(chunk(offset, Math.min(chunkSize, totalSize - offset), totalSize));
  }
  return chunks;
};

const ackFrame = seq => {
  const ack = new Uint8Array(8);
  ack[0] = 0x5a;
  ack[1] = 8;
  ack[4] = 1;
  ack[5] = 1;
  ack[6] = seq;
  ack[3] = protocolV2.crc8(ack, 3);
  ack[7] = protocolV2.crc8(ack, 7);
  return ack;
};

/**
 * Simulates the bootloader: every written FileWrite frame is answered in order. `reply` may
 * replace or prepend frames for a given request index.
 */
const createDevice = ({ reply } = {}) => {
  let responseSeq = 100;
  const queue = [];
  const waiters = [];
  const requests = [];
  let maxInFlight = 0;
  let answered = 0;
  const push = frame => {
    const waiter = waiters.shift();
    if (waiter) waiter(frame);
    else queue.push(frame);
  };
  const encode = (name, message) => {
    responseSeq += 1;
    return ProtocolV2.encodeFrame(schemas, name, message, {
      router: 1,
      packetSrc: 0,
      seq: responseSeq,
    });
  };
  const respond = () => {
    const index = answered;
    answered += 1;
    const request = requests[index];
    const { offset, total_size: totalSize, data } = request.message.file;
    // Decoded protobuf bytes are hex strings.
    const length = Number(typeof data === 'string' ? data.length / 2 : data.length);
    const confirmation = encode('FilesystemFile', {
      path: PATH,
      offset,
      total_size: totalSize,
      processed_byte: Number(offset) + length,
    });
    const frames = reply ? reply({ index, request, confirmation, encode }) : [confirmation];
    frames.forEach(push);
  };
  return {
    requests,
    get maxInFlight() {
      return maxInFlight;
    },
    writeFrame: jest.fn(frame => {
      const decoded = ProtocolV2.decodeFrame(schemas, frame);
      requests.push({ seq: frame[6], message: decoded.message });
      maxInFlight = Math.max(maxInFlight, requests.length - answered);
      return Promise.resolve();
    }),
    inject: (name, message) => push(encode(name, message)),
    readFrame: jest.fn(() => {
      while (!queue.length && answered < requests.length) {
        respond();
      }
      const frame = queue.shift();
      if (frame) return Promise.resolve(frame);
      return new Promise(resolve => {
        waiters.push(resolve);
      });
    }),
  };
};

const createSession = (device, options = {}) =>
  new ProtocolV2Session({
    schemas,
    router: 1,
    writeFrame: device.writeFrame,
    readFrame: device.readFrame,
    ...options,
  });

const runPipeline = (session, chunks, callOptions = {}) => {
  const [first, ...rest] = chunks;
  const next = jest.fn(() => Promise.resolve(rest.shift()));
  const onResponse = jest.fn();
  return {
    next,
    onResponse,
    result: session.call('FilesystemFileWrite', first, {
      ...callOptions,
      fileWritePipeline: { next, onResponse },
    }),
  };
};

describe('Protocol V2 file write pipeline', () => {
  test('keeps two ordered chunks in flight and confirms each one', async () => {
    const device = createDevice();
    const session = createSession(device);
    const { result, onResponse } = runPipeline(session, chunksOf(10, 2));

    await expect(result).resolves.toMatchObject({
      type: 'FilesystemFile',
      message: { processed_byte: 10 },
    });
    expect(PROTOCOL_V2_FILE_WRITE_PIPELINE_WINDOW).toBe(2);
    expect(device.maxInFlight).toBe(2);
    expect(device.requests.map(request => request.message.file.offset)).toEqual([0, 2, 4, 6, 8]);
    expect(onResponse.mock.calls.map(([response]) => response.message.processed_byte)).toEqual([
      2, 4, 6, 8, 10,
    ]);
  });

  test('sends a single-chunk file without asking for more than the source has', async () => {
    const device = createDevice();
    const session = createSession(device);
    const { result, next } = runPipeline(session, chunksOf(3, 4));

    await expect(result).resolves.toMatchObject({ message: { processed_byte: 3 } });
    expect(device.requests).toHaveLength(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('skips an ACK of an in-flight chunk', async () => {
    const device = createDevice({
      reply: ({ index, request, confirmation }) =>
        index === 0 ? [ackFrame(request.seq), confirmation] : [confirmation],
    });
    const session = createSession(device);
    const { result } = runPipeline(session, chunksOf(4, 2));

    await expect(result).resolves.toMatchObject({ message: { processed_byte: 4 } });
  });

  test('drains in-flight chunks after a device Failure and returns it', async () => {
    const device = createDevice({
      reply: ({ index, confirmation, encode }) =>
        index >= 1
          ? [encode('Failure', { code: 9, message: 'Write offset mismatch' })]
          : [confirmation],
    });
    const session = createSession(device);
    const { result, next, onResponse } = runPipeline(session, chunksOf(10, 2));

    await expect(result).resolves.toEqual({
      type: 'Failure',
      message: expect.objectContaining({ message: 'Write offset mismatch' }),
    });
    // Chunk 0 confirmed, chunk 1 failed; chunk 2 was already in flight and is drained.
    expect(onResponse).toHaveBeenCalledTimes(1);
    expect(device.requests).toHaveLength(3);
    expect(device.readFrame).toHaveBeenCalledTimes(3);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('keeps the link after a device Failure', async () => {
    const device = createDevice({
      reply: ({ encode }) => [encode('Failure', { code: 9, message: 'Write offset mismatch' })],
    });
    const adapter = {
      router: 1,
      generation: 1,
      prepareCall: jest.fn(),
      writeFrame: device.writeFrame,
      readFrame: device.readFrame,
      reset: jest.fn(),
    };
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'link-fatal',
    });
    const [first, ...rest] = chunksOf(6, 2);

    await expect(
      manager.call('device-a', () => adapter, 'FilesystemFileWrite', first, {
        fileWritePipeline: { next: () => Promise.resolve(rest.shift()), onResponse: jest.fn() },
      })
    ).resolves.toMatchObject({ type: 'Failure' });
    expect(adapter.reset).not.toHaveBeenCalled();
    expect(adapter.prepareCall).toHaveBeenCalledTimes(1);
  });

  test('invalidates the link when a confirmation does not match the oldest chunk', async () => {
    const device = createDevice({
      reply: ({ index, confirmation, encode }) =>
        index === 1
          ? [encode('FilesystemFile', { path: PATH, offset: 4, total_size: 6, processed_byte: 6 })]
          : [confirmation],
    });
    const adapter = {
      router: 1,
      generation: 1,
      prepareCall: jest.fn(),
      writeFrame: device.writeFrame,
      readFrame: device.readFrame,
      reset: jest.fn(() => Promise.resolve()),
    };
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'link-fatal',
    });
    const [first, ...rest] = chunksOf(6, 2);

    await expect(
      manager.call('device-a', () => adapter, 'FilesystemFileWrite', first, {
        fileWritePipeline: { next: () => Promise.resolve(rest.shift()), onResponse: jest.fn() },
      })
    ).rejects.toEqual(expect.objectContaining({ name: 'ProtocolV2LinkError', code: 'frame' }));
    expect(adapter.reset).toHaveBeenCalled();
  });

  test('rejects an interactive response inside the pipeline', async () => {
    const device = createDevice({
      reply: ({ encode }) => [encode('ButtonRequest', { code: 1 })],
    });
    const session = createSession(device);
    const { result } = runPipeline(session, chunksOf(4, 2));

    await expect(result).rejects.toEqual(
      expect.objectContaining({ name: 'ProtocolV2LinkError', code: 'frame' })
    );
  });

  test('rejects a source chunk that skips an offset before writing it', async () => {
    const device = createDevice();
    const session = createSession(device);
    const { result } = runPipeline(session, [chunk(0, 2, 8), chunk(4, 2, 8)]);

    await expect(result).rejects.toThrow('chunk out of order: expected offset 2, got 4');
    expect(device.requests).toHaveLength(1);
  });

  test('drains the in-flight chunk and returns the last confirmation when the source stops', async () => {
    const device = createDevice();
    const session = createSession(device);
    const { result, onResponse } = runPipeline(session, [chunk(0, 2, 6), chunk(2, 2, 6)]);

    await expect(result).resolves.toMatchObject({
      type: 'FilesystemFile',
      message: { processed_byte: 4 },
    });
    expect(onResponse).toHaveBeenCalledTimes(2);
  });

  test('detects a chunk lost before a bootloader that appends at its own cursor', async () => {
    let cursor = 0;
    const device = createDevice({
      reply: ({ index, request, encode }) => {
        // The third frame never reaches the bootloader, which echoes the request offset but
        // reports its own cursor in processed_byte.
        if (index === 2) return [];
        const { offset, total_size: totalSize, data } = request.message.file;
        cursor += data.length / 2;
        return [
          encode('FilesystemFile', {
            path: PATH,
            offset,
            total_size: totalSize,
            processed_byte: cursor,
          }),
        ];
      },
    });
    const session = createSession(device);
    const { result, onResponse } = runPipeline(session, chunksOf(10, 2));

    await expect(result).rejects.toEqual(
      expect.objectContaining({ name: 'ProtocolV2LinkError', code: 'frame' })
    );
    expect(onResponse.mock.calls.map(([response]) => response.message.processed_byte)).toEqual([
      2, 4,
    ]);
  });

  test('does not let skipped frames extend the wait for a response', async () => {
    const device = createDevice({ reply: () => [] });
    const noise = setInterval(() => device.inject('Success', { message: 'unrelated' }), 10);
    try {
      const session = createSession(device);
      const { result } = runPipeline(session, chunksOf(2, 2), { timeoutMs: 60 });

      await expect(result).rejects.toThrow('Protocol V2 response timeout after 60ms');
    } finally {
      clearInterval(noise);
    }
  });

  test('rejects a chunk whose frame exceeds the transport limit', async () => {
    const device = createDevice();
    const session = createSession(device, { maxFrameBytes: 64 });
    const { result } = runPipeline(session, [chunk(0, 128, 128)]);

    await expect(result).rejects.toThrow('Protocol V2 frame too large for transport');
    expect(device.requests).toHaveLength(0);
  });

  test('bounds each response wait instead of the whole file', async () => {
    const device = createDevice();
    const read = device.readFrame.getMockImplementation();
    device.readFrame.mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(read()), 40);
        })
    );
    const session = createSession(device);
    const { result } = runPipeline(session, chunksOf(8, 2), { timeoutMs: 100 });

    // Four 40 ms responses outlast the 100 ms timeout, but no single wait does.
    await expect(result).resolves.toMatchObject({ message: { processed_byte: 8 } });
  });

  test('times out a stalled response with the transport error', async () => {
    const device = createDevice();
    device.readFrame.mockImplementation(() => new Promise(() => {}));
    const createTimeoutError = jest.fn(
      (name, timeoutMs) => new Error(`BLE timeout ${name} ${timeoutMs}`)
    );
    const session = createSession(device, { createTimeoutError });
    const { result } = runPipeline(session, chunksOf(4, 2), { timeoutMs: 50 });

    await expect(result).rejects.toThrow('BLE timeout FilesystemFileWrite 50');
    expect(device.writeFrame.mock.calls[0][1].signal.aborted).toBe(true);
  });

  test('stops when the caller rejects a confirmed chunk', async () => {
    const device = createDevice();
    const session = createSession(device);
    const [first, ...rest] = chunksOf(10, 2);
    const result = session.call('FilesystemFileWrite', first, {
      fileWritePipeline: {
        next: () => Promise.resolve(rest.shift()),
        onResponse: () => {
          throw new Error('cancelled');
        },
      },
    });

    await expect(result).rejects.toThrow('cancelled');
    expect(device.requests).toHaveLength(2);
  });
});
