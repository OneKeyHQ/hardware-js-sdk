/* eslint-disable @typescript-eslint/no-var-requires */
const {
  PROTOCOL_V2_CHANNEL_USB,
  PROTOCOL_V2_FRAME_MAX_BYTES,
  ProtocolV2,
  ProtocolV2UsbTransportBase,
} = require('../src');
const { parseConfigure } = require('../src/serialization/protobuf/messages');

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
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    MessageType: {
      values: {
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
      },
    },
  },
});

const schemas = {
  protocolV1: protocolV1Messages,
  protocolV2: protocolV2Messages,
};

class FakeUsbTransport extends ProtocolV2UsbTransportBase {
  constructor() {
    super({
      router: PROTOCOL_V2_CHANNEL_USB,
      maxFrameBytes: PROTOCOL_V2_FRAME_MAX_BYTES,
      logPrefix: 'ProtocolV2 FakeUSB',
    });
    this.sentSeqs = [];
    this.readContexts = [];
    this.readCounts = new Map();
    this.packetQueues = new Map();
    this.nativeResets = [];
    this.invalidations = [];
    this.nextReadError = undefined;
    this.writeBlock = undefined;
    this.readBlock = undefined;
  }

  callDevice(key, message, timeoutMs) {
    return this.callProtocolV2Usb(
      key,
      'Ping',
      { message },
      timeoutMs === undefined ? undefined : { timeoutMs }
    );
  }

  rotate(key, reason = 'USB connection rotated') {
    return this.rotateProtocolV2UsbGeneration(key, reason);
  }

  invalidate(key, reason) {
    return this.invalidateProtocolV2UsbLink(key, reason);
  }

  dispose(reason) {
    return this.disposeProtocolV2UsbLinks(reason);
  }

  failNextRead(error) {
    this.nextReadError = error;
  }

  blockNextWrite() {
    let release;
    let markStarted;
    const started = new Promise(resolve => {
      markStarted = resolve;
    });
    const blocked = new Promise(resolve => {
      release = resolve;
    });
    this.writeBlock = { blocked, markStarted };
    return { started, release };
  }

  blockNextRead() {
    let release;
    let markStarted;
    const started = new Promise(resolve => {
      markStarted = resolve;
    });
    const blocked = new Promise(resolve => {
      release = resolve;
    });
    this.readBlock = { blocked, markStarted };
    return { started, release };
  }

  getProtocolV2UsbSchemas() {
    return schemas;
  }

  getProtocolV2UsbLogger() {
    return undefined;
  }

  async writeProtocolV2UsbPacket(key, frame) {
    const seq = frame[6];
    this.sentSeqs.push([key, seq]);
    const response = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_USB, seq }
    );
    const splitAt = Math.min(4, response.length);
    this.packetQueues.set(key, [response.slice(0, splitAt), response.slice(splitAt)]);

    const block = this.writeBlock;
    if (block) {
      this.writeBlock = undefined;
      block.markStarted();
      await block.blocked;
    }
  }

  readProtocolV2UsbPacket(key, context) {
    this.readContexts.push([key, context.timeoutMs]);
    this.readCounts.set(key, Number(this.readCounts.get(key) ?? 0) + 1);
    if (this.nextReadError) {
      const error = this.nextReadError;
      this.nextReadError = undefined;
      return Promise.reject(error);
    }
    const readPacket = async () => {
      const block = this.readBlock;
      if (block) {
        this.readBlock = undefined;
        block.markStarted();
        await block.blocked;
      }
      const packet = this.packetQueues.get(key)?.shift();
      if (!packet) throw new Error(`No queued USB packet for ${key}`);
      return packet;
    };
    return readPacket();
  }

  resetProtocolV2UsbNativeLink(key, reason) {
    this.nativeResets.push([key, reason]);
    return Promise.resolve();
  }

  onProtocolV2UsbLinkInvalidated(key, reason) {
    this.invalidations.push([key, reason]);
  }

  createProtocolV2UsbTimeoutError(name, timeoutMs) {
    return new Error(`USB timeout after ${timeoutMs}ms for ${name}`);
  }
}

describe('ProtocolV2UsbTransportBase', () => {
  test('keeps seq across USB generation rotation', async () => {
    const transport = new FakeUsbTransport();

    await transport.rotate('device-a');
    await transport.callDevice('device-a', 'first');
    await transport.rotate('device-a', 'USB reconnected');
    await transport.callDevice('device-a', 'second');

    expect(transport.sentSeqs).toEqual([
      ['device-a', 1],
      ['device-a', 2],
    ]);
    expect(transport.nativeResets).toEqual([['device-a', 'USB reconnected']]);
  });

  test('passes each queued call its own timeout context', async () => {
    const transport = new FakeUsbTransport();
    await transport.rotate('device-a');

    await Promise.all([
      transport.callDevice('device-a', 'first', 111),
      transport.callDevice('device-a', 'second', 222),
    ]);

    expect(transport.readContexts).toEqual([
      ['device-a', 111],
      ['device-a', 111],
      ['device-a', 222],
      ['device-a', 222],
    ]);
  });

  test('does not block a different USB path', async () => {
    const transport = new FakeUsbTransport();
    await transport.rotate('device-a');
    await transport.rotate('device-b');
    const blockedWrite = transport.blockNextWrite();

    const callA = transport.callDevice('device-a', 'blocked');
    await blockedWrite.started;
    await expect(transport.callDevice('device-b', 'parallel')).resolves.toMatchObject({
      type: 'Success',
    });
    blockedWrite.release();
    await expect(callA).resolves.toMatchObject({ type: 'Success' });
  });

  test('invalidates an in-flight generation before it can read', async () => {
    const transport = new FakeUsbTransport();
    await transport.rotate('device-a');
    const blockedWrite = transport.blockNextWrite();

    const call = transport.callDevice('device-a', 'blocked');
    await blockedWrite.started;
    await transport.rotate('device-a', 'USB generation changed');
    blockedWrite.release();

    await expect(call).rejects.toThrow('USB generation changed');
    expect(transport.readCounts.get('device-a') ?? 0).toBe(0);
  });

  test('rejects an in-flight packet read without waiting for native IO to settle', async () => {
    const transport = new FakeUsbTransport();
    await transport.rotate('device-a');
    const blockedRead = transport.blockNextRead();

    const call = transport.callDevice('device-a', 'blocked-read', 5000);
    const outcome = call.then(
      () => 'resolved',
      error => error.message
    );
    await blockedRead.started;
    await transport.invalidate('device-a', 'USB transport released');
    const settled = await Promise.race([
      outcome,
      new Promise(resolve => {
        setTimeout(() => resolve('still pending'), 50);
      }),
    ]);
    blockedRead.release();

    expect(settled).toContain('USB transport released');
  });

  test('invalidates the native link after a packet read failure', async () => {
    const transport = new FakeUsbTransport();
    await transport.rotate('device-a');
    transport.failNextRead(new Error('USB transfer failed'));

    await expect(transport.callDevice('device-a', 'failure')).rejects.toThrow(
      'USB transfer failed'
    );
    expect(transport.nativeResets).toEqual([
      ['device-a', expect.stringContaining('USB transfer failed')],
    ]);
    expect(transport.invalidations).toEqual([
      ['device-a', expect.stringContaining('USB transfer failed')],
    ]);
  });

  test('dispose clears the cursor and restarts seq from one', async () => {
    const transport = new FakeUsbTransport();
    await transport.rotate('device-a');
    await transport.callDevice('device-a', 'before-dispose');
    await transport.dispose('transport disposed');
    await transport.rotate('device-a');
    await transport.callDevice('device-a', 'after-dispose');

    expect(transport.sentSeqs.map(([, seq]) => seq)).toEqual([1, 1]);
  });
});
