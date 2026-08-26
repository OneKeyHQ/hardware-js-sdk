import { protobufManager } from '@onekeyfe/hwk-trezor-protobuf';
import { DefaultDefinitions } from '@onekeyfe/hwk-trezor-protobuf/hwk';
import {
  thp as protocolThp,
  v1 as protocolV1,
  v2 as protocolV2,
} from '@onekeyfe/hwk-trezor-protocol';
import { buildMessage, createChunks } from '@onekeyfe/hwk-trezor-transport/hwk';

import { type TrezorByteTransport, TrezorCore } from '../index';

class MemoryByteTransport implements TrezorByteTransport {
  readonly writes: Buffer[] = [];

  private readonly reads: Buffer[];

  constructor(reads: Buffer[]) {
    this.reads = [...reads];
  }

  async write(chunk: Buffer) {
    this.writes.push(chunk);
  }

  async read() {
    const next = this.reads.shift();
    if (!next) throw new Error('No queued read');
    return next;
  }
}

class SignalRecordingByteTransport extends MemoryByteTransport {
  readonly signals: Array<AbortSignal | undefined> = [];

  override async write(chunk: Buffer, signal?: AbortSignal) {
    this.signals.push(signal);
    await super.write(chunk);
  }

  override async read(signal?: AbortSignal) {
    this.signals.push(signal);
    return super.read();
  }
}

const createRnLikeBuffer = (bytes: Buffer): Buffer =>
  Object.assign(new Uint8Array(bytes), {
    readUInt8: bytes.readUInt8.bind(bytes),
    readUint16BE: bytes.readUInt16BE.bind(bytes),
    subarray: (start?: number, end?: number) => new Uint8Array(bytes.subarray(start, end)),
    toString: bytes.toString.bind(bytes),
  }) as unknown as Buffer;

const createPaddedUint8Array = (bytes: Buffer, length: number): Buffer => {
  const padded = new Uint8Array(length);
  padded.set(bytes);
  return padded as unknown as Buffer;
};

describe('TrezorCore', () => {
  protobufManager.load(DefaultDefinitions);

  test('calls a protobuf method over protocol v1 and decodes the response', async () => {
    const responseBytes = buildMessage({
      name: 'Features',
      data: {
        vendor: 'trezor.io',
        major_version: 2,
        minor_version: 8,
        patch_version: 10,
        model: 'T3T1',
      },
      protocol: protocolV1,
    });
    const [, responseChunkHeader] = protocolV1.getHeaders(responseBytes);
    const responseChunks = createChunks(responseBytes, responseChunkHeader, 64);
    const transport = new MemoryByteTransport(responseChunks);
    const core = new TrezorCore({ transport, protocol: protocolV1, chunkSize: 64 });

    const response = await core.call('Initialize', {});

    expect(transport.writes).toHaveLength(1);
    expect(transport.writes[0]).toHaveLength(64);
    expect(response).toEqual({
      type: 'Features',
      message: expect.objectContaining({
        vendor: 'trezor.io',
        major_version: 2,
        minor_version: 8,
        patch_version: 10,
        model: 'T3T1',
      }),
    });
  });

  test('surfaces a Trezor Failure response as an exception', async () => {
    const responseBytes = buildMessage({
      name: 'Failure',
      data: {
        code: 'Failure_ActionCancelled',
        message: 'cancelled',
      },
      protocol: protocolV1,
    });
    const [, responseChunkHeader] = protocolV1.getHeaders(responseBytes);
    const transport = new MemoryByteTransport(createChunks(responseBytes, responseChunkHeader, 64));
    const core = new TrezorCore({ transport, protocol: protocolV1, chunkSize: 64 });

    await expect(core.call('Initialize', {})).rejects.toMatchObject({
      code: 'Failure_ActionCancelled',
      message: 'cancelled',
    });
  });

  test('reads all chunks before decoding a multi-chunk response', async () => {
    const responseBytes = buildMessage({
      name: 'Features',
      data: {
        vendor: 'trezor.io',
        major_version: 2,
        minor_version: 8,
        patch_version: 10,
        label: 'x'.repeat(180),
      },
      protocol: protocolV1,
    });
    const [, responseChunkHeader] = protocolV1.getHeaders(responseBytes);
    const responseChunks = createChunks(responseBytes, responseChunkHeader, 64);
    const transport = new MemoryByteTransport(responseChunks);
    const core = new TrezorCore({ transport, protocol: protocolV1, chunkSize: 64 });

    const response = await core.call('Initialize', {});

    expect(responseChunks.length).toBeGreaterThan(1);
    expect(response).toEqual({
      type: 'Features',
      message: expect.objectContaining({
        label: 'x'.repeat(180),
      }),
    });
  });

  test('normalizes RN Uint8Array chunks before validating continuation headers', async () => {
    const responseBytes = buildMessage({
      name: 'Features',
      data: {
        vendor: 'trezor.io',
        major_version: 2,
        minor_version: 8,
        patch_version: 10,
        label: 'rn-continuation'.repeat(18),
      },
      protocol: protocolV1,
    });
    const [, responseChunkHeader] = protocolV1.getHeaders(responseBytes);
    const responseChunks = createChunks(responseBytes, responseChunkHeader, 64).map(
      createRnLikeBuffer
    );
    const transport = new MemoryByteTransport(responseChunks);
    const core = new TrezorCore({ transport, protocol: protocolV1, chunkSize: 64 });

    const response = await core.call('Initialize', {});

    expect(responseChunks.length).toBeGreaterThan(1);
    expect(response).toEqual({
      type: 'Features',
      message: expect.objectContaining({
        label: 'rn-continuation'.repeat(18),
      }),
    });
  });

  test('calls a THP channel allocation method over protocol v2', async () => {
    const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const thpState = new protocolThp.ThpState();
    const responseBytes = Buffer.from(
      '41ffff0022cb263fc1c42de1ac12340a045432543110001800200228022803280428017d8ccd6b',
      'hex'
    );
    thpState.setChannel(responseBytes.subarray(1, 3));
    const transport = new MemoryByteTransport([responseBytes]);
    const core = new TrezorCore({
      transport,
      protocol: protocolV2,
      chunkSize: 64,
      logger: entry => logs.push({ event: entry.event, data: entry.data }),
    });

    const response = await core.call(
      'ThpCreateChannelRequest',
      { nonce: 'cb263fc1c42de1ac' },
      { thpState }
    );

    expect(transport.writes).toHaveLength(1);
    expect(response.type).toBe('ThpCreateChannelResponse');
    expect(logs.map(log => log.event)).not.toContain('thp.loop');
    expect(logs).toEqual(
      expect.arrayContaining([
        {
          event: 'core.call.sync',
          data: expect.objectContaining({
            requestName: 'ThpCreateChannelRequest',
            responseType: 'ThpCreateChannelResponse',
          }),
        },
      ])
    );
  });

  test('does not write THP sync diagnostics to console by default', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const thpState = new protocolThp.ThpState();
      const responseBytes = Buffer.from(
        '41ffff0022cb263fc1c42de1ac12340a045432543110001800200228022803280428017d8ccd6b',
        'hex'
      );
      thpState.setChannel(responseBytes.subarray(1, 3));
      const transport = new MemoryByteTransport([responseBytes]);
      const core = new TrezorCore({
        transport,
        protocol: protocolV2,
        chunkSize: 64,
      });

      await core.call('ThpCreateChannelRequest', { nonce: 'cb263fc1c42de1ac' }, { thpState });

      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[TREZOR_VERIFY]'),
        expect.anything()
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  test('unwraps THP abort options before forwarding signals to the byte transport', async () => {
    const thpState = new protocolThp.ThpState();
    const responseBytes = Buffer.from(
      '41ffff0022cb263fc1c42de1ac12340a045432543110001800200228022803280428017d8ccd6b',
      'hex'
    );
    thpState.setChannel(responseBytes.subarray(1, 3));
    const transport = new SignalRecordingByteTransport([responseBytes]);
    const core = new TrezorCore({ transport, protocol: protocolV2, chunkSize: 64 });
    const controller = new AbortController();

    await core.call(
      'ThpCreateChannelRequest',
      { nonce: 'cb263fc1c42de1ac' },
      { thpState, signal: controller.signal }
    );

    expect(transport.signals.length).toBeGreaterThan(0);
    const forwardedSignals = transport.signals.filter(
      (signal): signal is AbortSignal => signal !== undefined
    );
    expect(forwardedSignals.length).toBeGreaterThan(0);
    for (const signal of forwardedSignals) {
      expect(typeof signal.addEventListener).toBe('function');
    }
  });

  test('accepts RN Buffer polyfill chunks whose subarray returns Uint8Array', async () => {
    const thpState = new protocolThp.ThpState();
    const responseBytes = Buffer.from(
      '41ffff0022cb263fc1c42de1ac12340a045432543110001800200228022803280428017d8ccd6b',
      'hex'
    );
    thpState.setChannel(responseBytes.subarray(1, 3));
    const transport = new MemoryByteTransport([createRnLikeBuffer(responseBytes)]);
    const core = new TrezorCore({ transport, protocol: protocolV2, chunkSize: 64 });

    const response = await core.call(
      'ThpCreateChannelRequest',
      { nonce: 'cb263fc1c42de1ac' },
      { thpState }
    );

    expect(response.type).toBe('ThpCreateChannelResponse');
  });

  test('accepts padded RN Uint8Array chunks over THP', async () => {
    const thpState = new protocolThp.ThpState();
    const responseBytes = Buffer.from(
      '41ffff001dd5a22d483e788fb51fb20a0454335731108302180220002802a617f658',
      'hex'
    );
    thpState.setChannel(Buffer.from('ffff', 'hex'));
    const transport = new MemoryByteTransport([createPaddedUint8Array(responseBytes, 244)]);
    const core = new TrezorCore({ transport, protocol: protocolV2, chunkSize: 244 });

    const response = await core.call(
      'ThpCreateChannelRequest',
      { nonce: Buffer.from('d5a22d483e788fb5', 'hex') },
      { thpState }
    );

    expect(response.type).toBe('ThpCreateChannelResponse');
    expect(response.message).toMatchObject({
      channel: Buffer.from('1fb2', 'hex'),
      nonce: Buffer.from('d5a22d483e788fb5', 'hex'),
    });
  });

  test('accepts RN Uint8Array channel state over THP channel allocation', async () => {
    const thpState = new protocolThp.ThpState();
    const responseBytes = Buffer.from(
      '41ffff001d953273ca10a34f7b1fb30a04543357311083021802200028021b9e1917',
      'hex'
    );
    thpState.setChannel(new Uint8Array([0xff, 0xff]) as unknown as Buffer);
    const transport = new MemoryByteTransport([createPaddedUint8Array(responseBytes, 244)]);
    const core = new TrezorCore({ transport, protocol: protocolV2, chunkSize: 244 });

    const response = await core.call(
      'ThpCreateChannelRequest',
      { nonce: Buffer.from('953273ca10a34f7b', 'hex') },
      { thpState }
    );

    expect(response.type).toBe('ThpCreateChannelResponse');
    expect(response.message).toMatchObject({
      channel: Buffer.from('1fb3', 'hex'),
      nonce: Buffer.from('953273ca10a34f7b', 'hex'),
    });
  });
});
