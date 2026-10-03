/* eslint-disable @typescript-eslint/no-var-requires */
const { ProtocolV2, ProtocolV2LinkManager } = require('../src');
const { parseConfigure } = require('../src/serialization/protobuf/messages');
const protocolV2 = require('../src/protocols/v2');

const protocolV1Messages = parseConfigure({
  nested: {
    Failure: {
      fields: {
        code: { type: 'uint32', id: 1 },
        message: { type: 'string', id: 2 },
      },
    },
    MessageType: {
      values: {
        MessageType_Failure: 3,
      },
    },
  },
});

const protocolV2Messages = parseConfigure({
  nested: {
    Ping: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    Cancel: {
      fields: {},
    },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
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
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
        MessageType_Cancel: 60004,
        MessageType_FilesystemFile: 60803,
        MessageType_FilesystemFileWrite: 60805,
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

const createAdapterFactory = sentSeqs => {
  const adapters = [];
  let generation = 0;
  const success = ProtocolV2.encodeFrame(
    schemas,
    'Success',
    { message: 'ok' },
    { router: 1, packetSrc: 0, seq: 1 }
  );

  return {
    adapters,
    createAdapter: () => {
      let requestSeq = 0;
      const adapter = {
        router: 1,
        generation: ++generation,
        prepareCall: jest.fn(),
        writeFrame: jest.fn(frame => {
          const [, , , , , , seq] = frame;
          requestSeq = seq;
          sentSeqs.push(requestSeq);
          return Promise.resolve();
        }),
        readFrame: jest.fn(() => Promise.resolve(rewriteSeq(success, requestSeq))),
        reset: jest.fn(() => Promise.resolve()),
      };
      adapters.push(adapter);
      return adapter;
    },
  };
};

describe('ProtocolV2LinkManager', () => {
  test('accepts per-chunk replies in a file write pipeline', async () => {
    const writes = [];
    const reads = [];
    const confirmed = [];
    const chunks = [0, 2, 4].map(offset => ({
      file: {
        path: 'vol0:/test.okpkg',
        offset,
        total_size: 6,
        data: new Uint8Array([offset, offset + 1]),
      },
      overwrite: offset === 0,
      append: false,
    }));
    const adapter = {
      router: 1,
      generation: 1,
      prepareCall: jest.fn(),
      writeFrame: jest.fn(frame => {
        writes.push(frame);
        return Promise.resolve();
      }),
      readFrame: jest.fn(() => {
        reads.push(writes.length);
        const offset = (reads.length - 1) * 2;
        return Promise.resolve(
          ProtocolV2.encodeFrame(
            schemas,
            'FilesystemFile',
            { path: 'vol0:/test.okpkg', offset, total_size: 6, processed_byte: offset + 2 },
            { router: 1, packetSrc: 0, seq: reads.length }
          )
        );
      }),
      reset: jest.fn(),
    };
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'link-fatal',
    });
    const result = await manager.call('device-a', () => adapter, 'FilesystemFileWrite', chunks[0], {
      fileWritePipeline: {
        next: jest.fn().mockResolvedValueOnce(chunks[1]).mockResolvedValueOnce(chunks[2]),
        onResponse: response => confirmed.push(response.message.processed_byte),
      },
    });

    expect(reads).toEqual([3, 3, 3]);
    expect(confirmed).toEqual([2, 4, 6]);
    expect(result.message.processed_byte).toBe(6);
    expect(adapter.reset).not.toHaveBeenCalled();
  });

  test('invalidates a file write pipeline on a mismatched offset', async () => {
    const adapter = {
      router: 1,
      generation: 1,
      prepareCall: jest.fn(),
      writeFrame: jest.fn(() => Promise.resolve()),
      readFrame: jest.fn(() =>
        Promise.resolve(
          ProtocolV2.encodeFrame(
            schemas,
            'FilesystemFile',
            { path: 'vol0:/test.okpkg', offset: 0, total_size: 4, processed_byte: 3 },
            { router: 1, packetSrc: 0, seq: 1 }
          )
        )
      ),
      reset: jest.fn(() => Promise.resolve()),
    };
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'link-fatal',
    });
    const chunk = offset => ({
      file: { path: 'vol0:/test.okpkg', offset, total_size: 4, data: new Uint8Array(2) },
      overwrite: offset === 0,
      append: false,
    });

    await expect(
      manager.call('device-a', () => adapter, 'FilesystemFileWrite', chunk(0), {
        fileWritePipeline: {
          next: jest.fn().mockResolvedValueOnce(chunk(2)).mockResolvedValueOnce(undefined),
          onResponse: jest.fn(),
        },
      })
    ).rejects.toThrow('does not match pending chunk');
    expect(adapter.reset).toHaveBeenCalled();
  });

  test('retains the device sequence cursor when an active link is rebuilt', async () => {
    const sentSeqs = [];
    const { adapters, createAdapter } = createAdapterFactory(sentSeqs);
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });

    await manager.call('device-a', createAdapter, 'Ping', { message: '1' });
    await manager.invalidateLink('device-a', 'reconnect');
    await manager.call('device-a', createAdapter, 'Ping', { message: '2' });

    expect(sentSeqs).toEqual([1, 2]);
    expect(adapters).toHaveLength(2);
    expect(adapters[0].reset).toHaveBeenCalledWith('reconnect');
  });

  test('prepares the active adapter with the same call context used for frame IO', async () => {
    const sentSeqs = [];
    const { adapters, createAdapter } = createAdapterFactory(sentSeqs);
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });

    await manager.call('device-a', createAdapter, 'Ping', { message: '1' }, { timeoutMs: 123 });

    expect(adapters[0].prepareCall).toHaveBeenCalledWith(
      expect.objectContaining({
        messageName: 'Ping',
        timeoutMs: 123,
        highThroughput: false,
        generation: 1,
        signal: expect.any(AbortSignal),
      })
    );
  });

  test('invalidates a link-fatal call before the next call creates a new link', async () => {
    const sentSeqs = [];
    const onLinkInvalidated = jest.fn();
    const { adapters, createAdapter: createWorkingAdapter } = createAdapterFactory(sentSeqs);
    const createAdapter = jest
      .fn()
      .mockImplementationOnce(() => {
        const adapter = createWorkingAdapter();
        adapter.writeFrame.mockImplementationOnce(frame => {
          sentSeqs.push(frame[6]);
          return Promise.reject(new Error('transport write failed'));
        });
        return adapter;
      })
      .mockImplementation(() => createWorkingAdapter());
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'link-fatal',
      onLinkInvalidated,
    });

    await expect(manager.call('device-a', createAdapter, 'Ping', { message: '1' })).rejects.toThrow(
      'transport write failed'
    );
    await expect(
      manager.call('device-a', createAdapter, 'Ping', { message: '2' })
    ).resolves.toEqual({
      type: 'Success',
      message: { message: 'ok' },
    });

    expect(createAdapter).toHaveBeenCalledTimes(2);
    expect(adapters[0].reset).toHaveBeenCalledWith(
      expect.stringContaining('transport write failed')
    );
    expect(onLinkInvalidated).toHaveBeenCalledWith(
      'device-a',
      expect.stringContaining('transport write failed')
    );
    expect(sentSeqs).toEqual([1, 2]);
  });

  test('invalidates every active link while retaining per-device cursors', async () => {
    const sentSeqs = [];
    const { adapters, createAdapter } = createAdapterFactory(sentSeqs);
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });

    await manager.call('device-a', createAdapter, 'Ping', { message: 'a1' });
    await manager.call('device-b', createAdapter, 'Ping', { message: 'b1' });
    await manager.invalidateAllLinks('schema changed');
    await manager.call('device-a', createAdapter, 'Ping', { message: 'a2' });
    await manager.call('device-b', createAdapter, 'Ping', { message: 'b2' });

    expect(sentSeqs).toEqual([1, 1, 2, 2]);
    expect(adapters).toHaveLength(4);
    expect(adapters[0].reset).toHaveBeenCalledWith('schema changed');
    expect(adapters[1].reset).toHaveBeenCalledWith('schema changed');
  });

  test('waits for an in-flight native cleanup before a concurrent invalidation resolves', async () => {
    const sentSeqs = [];
    const { adapters, createAdapter } = createAdapterFactory(sentSeqs);
    let markCleanupStarted;
    let finishCleanup;
    const cleanupStarted = new Promise(resolve => {
      markCleanupStarted = resolve;
    });
    const cleanupBlocked = new Promise(resolve => {
      finishCleanup = resolve;
    });
    const onLinkInvalidated = jest.fn(async () => {
      markCleanupStarted();
      await cleanupBlocked;
    });
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
      onLinkInvalidated,
    });

    await manager.call('device-a', createAdapter, 'Ping', { message: '1' });

    const release = manager.invalidateLink('device-a', 'release');
    await cleanupStarted;

    let acquireSettled = false;
    const acquire = manager.invalidateLink('device-a', 'acquire').then(() => {
      acquireSettled = true;
    });
    await new Promise(resolve => {
      setImmediate(resolve);
    });

    expect(acquireSettled).toBe(false);
    expect(adapters[0].reset).toHaveBeenCalledTimes(1);
    expect(onLinkInvalidated).toHaveBeenCalledTimes(1);

    finishCleanup();
    await Promise.all([release, acquire]);

    await manager.call('device-a', createAdapter, 'Ping', { message: '2' });

    expect(acquireSettled).toBe(true);
    expect(sentSeqs).toEqual([1, 2]);
    expect(adapters).toHaveLength(2);
  });

  test('dispose clears active links and sequence cursors', async () => {
    const sentSeqs = [];
    const { adapters, createAdapter } = createAdapterFactory(sentSeqs);
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });

    await manager.call('device-a', createAdapter, 'Ping', { message: '1' });
    await manager.dispose('transport disposed');
    await manager.call('device-a', createAdapter, 'Ping', { message: '2' });

    expect(sentSeqs).toEqual([1, 1]);
    expect(adapters[0].reset).toHaveBeenCalledWith('transport disposed');
  });

  test('serializes calls per device without blocking another device', async () => {
    const events = [];
    let releaseDeviceA;
    const deviceABlocked = new Promise(resolve => {
      releaseDeviceA = resolve;
    });
    const success = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: 1, packetSrc: 0, seq: 1 }
    );
    const createAdapter = key => {
      let requestSeq = 0;
      return {
        router: 1,
        generation: 1,
        prepareCall: jest.fn(),
        writeFrame: jest.fn(frame => {
          const [, , , , , , seq] = frame;
          requestSeq = seq;
          events.push(`write:${key}:${requestSeq}`);
          return Promise.resolve();
        }),
        readFrame: jest.fn(async () => {
          if (key === 'device-a' && requestSeq === 1) {
            await deviceABlocked;
          }
          events.push(`read:${key}:${requestSeq}`);
          return rewriteSeq(success, requestSeq);
        }),
        reset: jest.fn(),
      };
    };
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });

    const firstA = manager.call('device-a', () => createAdapter('device-a'), 'Ping', {
      message: 'a1',
    });
    const secondA = manager.call('device-a', () => createAdapter('device-a'), 'Ping', {
      message: 'a2',
    });
    const firstB = manager.call('device-b', () => createAdapter('device-b'), 'Ping', {
      message: 'b1',
    });

    await firstB;
    expect(events).toEqual(['write:device-a:1', 'write:device-b:1', 'read:device-b:1']);
    releaseDeviceA();
    await Promise.all([firstA, secondA]);
    expect(events).toEqual([
      'write:device-a:1',
      'write:device-b:1',
      'read:device-b:1',
      'read:device-a:1',
      'write:device-a:2',
      'read:device-a:2',
    ]);
  });

  test('times out a queued call without sending it after the active call settles', async () => {
    let releaseActiveRead;
    let markActiveReadStarted;
    const activeReadStarted = new Promise(resolve => {
      markActiveReadStarted = resolve;
    });
    const activeReadBlocked = new Promise(resolve => {
      releaseActiveRead = resolve;
    });
    const sentSeqs = [];
    const success = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: 1, packetSrc: 0, seq: 1 }
    );
    let requestSeq = 0;
    let readCount = 0;
    const adapter = {
      router: 1,
      generation: 1,
      prepareCall: jest.fn(),
      writeFrame: jest.fn(frame => {
        [, , , , , , requestSeq] = frame;
        sentSeqs.push(requestSeq);
        return Promise.resolve();
      }),
      readFrame: jest.fn(async () => {
        readCount += 1;
        if (readCount === 1) {
          markActiveReadStarted();
          await activeReadBlocked;
        }
        return rewriteSeq(success, requestSeq);
      }),
      reset: jest.fn(),
      createTimeoutError: (name, timeoutMs) =>
        new Error(`response timeout after ${timeoutMs}ms for ${name}`),
    };
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });
    const createAdapter = jest.fn(() => adapter);

    const activeCall = manager.call('device-a', createAdapter, 'Ping', { message: 'active' });
    await activeReadStarted;
    const queuedCall = manager.call(
      'device-a',
      createAdapter,
      'Ping',
      { message: 'queued' },
      { timeoutMs: 20 }
    );

    await expect(queuedCall).rejects.toThrow('response timeout after 20ms for Ping');
    expect(sentSeqs).toEqual([1]);

    releaseActiveRead();
    await activeCall;
    await expect(
      manager.call('device-a', createAdapter, 'Ping', { message: 'after-timeout' })
    ).resolves.toEqual({
      type: 'Success',
      message: { message: 'ok' },
    });

    expect(sentSeqs).toEqual([1, 2]);
  });

  test('writes flow control while the active call is waiting for its response', async () => {
    const sentSeqs = [];
    let releaseRead;
    let markReadStarted;
    const readStarted = new Promise(resolve => {
      markReadStarted = resolve;
    });
    const readBlocked = new Promise(resolve => {
      releaseRead = resolve;
    });
    const success = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: 1, packetSrc: 0, seq: 1 }
    );
    let requestSeq = 0;
    const adapter = {
      router: 1,
      generation: 1,
      prepareCall: jest.fn(),
      writeFrame: jest.fn(frame => {
        [, , , , , , requestSeq] = frame;
        sentSeqs.push(requestSeq);
        return Promise.resolve();
      }),
      readFrame: jest.fn(async () => {
        markReadStarted();
        await readBlocked;
        return rewriteSeq(success, 1);
      }),
      reset: jest.fn(),
    };
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });
    const createAdapter = jest.fn(() => adapter);

    const activeCall = manager.call('device-a', createAdapter, 'Ping', { message: 'pending' });
    await readStarted;
    await expect(manager.sendFlowControl('device-a', createAdapter, 'Cancel', {})).resolves.toEqual(
      { type: 'WriteCompleted', message: {} }
    );

    expect(sentSeqs).toEqual([1, 2]);
    expect(adapter.prepareCall).toHaveBeenCalledTimes(1);
    expect(adapter.readFrame).toHaveBeenCalledTimes(1);
    releaseRead();
    await activeCall;
  });

  test('keeps a recoverable link after a call error', async () => {
    const sentSeqs = [];
    const { adapters, createAdapter } = createAdapterFactory(sentSeqs);
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });
    const adapter = createAdapter();
    adapter.writeFrame.mockImplementationOnce(frame => {
      sentSeqs.push(frame[6]);
      return Promise.reject(new Error('application retryable error'));
    });
    const factory = jest.fn(() => adapter);

    await expect(manager.call('device-a', factory, 'Ping', { message: '1' })).rejects.toThrow(
      'application retryable error'
    );
    await manager.call('device-a', factory, 'Ping', { message: '2' });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(adapter.reset).not.toHaveBeenCalled();
    expect(sentSeqs).toEqual([1, 2]);
  });

  test('removes a settled per-device call queue', async () => {
    const sentSeqs = [];
    const { createAdapter } = createAdapterFactory(sentSeqs);
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });

    await manager.call('device-a', createAdapter, 'Ping', { message: 'done' });

    expect(manager.callQueues.size).toBe(0);
  });

  test('stops an in-flight call before reading when its link is invalidated during write', async () => {
    let releaseWrite;
    let markWriteStarted;
    const writeStarted = new Promise(resolve => {
      markWriteStarted = resolve;
    });
    const writeBlocked = new Promise(resolve => {
      releaseWrite = resolve;
    });
    const success = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: 1, packetSrc: 0, seq: 1 }
    );
    const adapter = {
      router: 1,
      generation: 1,
      prepareCall: jest.fn(),
      writeFrame: jest.fn(async () => {
        markWriteStarted();
        await writeBlocked;
      }),
      readFrame: jest.fn(() => Promise.resolve(success)),
      reset: jest.fn(),
    };
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });

    const call = manager.call('device-a', () => adapter, 'Ping', { message: 'pending' });
    await writeStarted;
    await manager.invalidateLink('device-a', 'device disconnected');
    releaseWrite();

    await expect(call).rejects.toThrow('device disconnected');
    expect(adapter.readFrame).not.toHaveBeenCalled();
  });

  test('rejects calls queued before their link generation is invalidated', async () => {
    let releaseWrite;
    let markWriteStarted;
    const writeStarted = new Promise(resolve => {
      markWriteStarted = resolve;
    });
    const writeBlocked = new Promise(resolve => {
      releaseWrite = resolve;
    });
    const success = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: 1, packetSrc: 0, seq: 1 }
    );
    const adapter = {
      router: 1,
      generation: 1,
      prepareCall: jest.fn(),
      writeFrame: jest.fn(async () => {
        markWriteStarted();
        await writeBlocked;
      }),
      readFrame: jest.fn(() => Promise.resolve(success)),
      reset: jest.fn(),
    };
    const createAdapter = jest.fn(() => adapter);
    const manager = new ProtocolV2LinkManager({
      getSchemas: () => schemas,
      classifyError: () => 'recoverable',
    });

    const activeCall = manager.call('device-a', createAdapter, 'Ping', { message: 'active' });
    await writeStarted;
    const queuedCall = manager.call('device-a', createAdapter, 'Ping', { message: 'queued' });
    await manager.invalidateLink('device-a', 'device released');
    releaseWrite();

    await expect(activeCall).rejects.toThrow('device released');
    await expect(queuedCall).rejects.toThrow('device released');
    expect(createAdapter).toHaveBeenCalledTimes(1);
    expect(adapter.writeFrame).toHaveBeenCalledTimes(1);
    expect(adapter.readFrame).not.toHaveBeenCalled();
  });
});
