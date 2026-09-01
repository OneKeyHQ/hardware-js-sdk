/* eslint-disable @typescript-eslint/no-var-requires */
const LowlevelTransport = require('../src').default;
const { parseConfigure } = require('../../hd-transport/src/serialization/protobuf/messages');
const { ProtocolV1, ProtocolV2 } = require('../../hd-transport/src/protocols');
const { bytesToHex } = require('../../hd-transport/src/protocols/v2/session');
const { PROTOCOL_V2_CHANNEL_BLE_UART } = require('../../hd-transport/src/constants');

const protocolV1Schema = {
  nested: {
    Initialize: {
      fields: {},
    },
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
        MessageType_Initialize: 1,
        MessageType_Success: 2,
      },
    },
  },
};

const protocolV2Schema = {
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
          rule: 'repeated',
          type: 'uint32',
          id: 2,
          options: {
            packed: false,
          },
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
    MessageType: {
      values: {
        MessageType_ProtocolInfoRequest: 60200,
        MessageType_ProtocolInfo: 60201,
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
        MessageType_Failure: 60208,
      },
    },
  },
};

const schemas = {
  protocolV1: parseConfigure(protocolV1Schema),
  protocolV2: parseConfigure(protocolV2Schema),
};

const createLogger = () => ({
  debug: jest.fn(),
  error: jest.fn(),
});

const createPlugin = ({ devices, responses }) => ({
  enumerate: jest.fn(() => Promise.resolve(devices)),
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  init: jest.fn(() => Promise.resolve()),
  send: jest.fn(() => Promise.resolve()),
  receive: jest.fn(() => {
    const next = responses.shift();
    if (next instanceof Error) {
      return Promise.reject(next);
    }
    if (!next) {
      return Promise.reject(new Error('No queued response'));
    }
    return Promise.resolve(next);
  }),
  version: 'test-plugin',
});

const configureTransport = plugin => {
  const lowlevel = new LowlevelTransport();
  lowlevel.init(createLogger(), undefined, plugin);
  lowlevel.configure(protocolV1Schema);
  lowlevel.configureProtocolV2(protocolV2Schema);
  return lowlevel;
};

const splitFrame = (frame, index) => [
  bytesToHex(frame.slice(0, index)),
  bytesToHex(frame.slice(index)),
];

describe('LowlevelTransport protocol framing', () => {
  test('falls back to Protocol V2 when a cached V1 hint is stale', async () => {
    const plugin = createPlugin({ devices: [], responses: [] });
    const lowlevel = configureTransport(plugin);
    const events = [];
    lowlevel.probeProtocolV1 = jest.fn().mockImplementation(() => {
      events.push('probe-v1');
      return Promise.resolve(false);
    });
    lowlevel.resetConnectionAfterProbe = jest.fn().mockImplementation(() => {
      events.push('reset');
      return Promise.resolve();
    });
    lowlevel.probeProtocolV2 = jest.fn().mockImplementation(() => {
      events.push('probe-v2');
      return Promise.resolve(true);
    });

    await expect(lowlevel.detectProtocol('pro-lowlevel', undefined, 'V1')).resolves.toBe('V2');

    expect(events).toEqual(['probe-v1', 'reset', 'probe-v2']);
    expect(lowlevel.getProtocolType('pro-lowlevel')).toBe('V2');
  });

  test('keeps active links when the Protocol V2 schema is configured repeatedly', () => {
    const lowlevel = new LowlevelTransport();
    const invalidateAllLinks = jest.fn().mockResolvedValue(undefined);
    lowlevel.protocolV2Links.invalidateAllLinks = invalidateAllLinks;

    lowlevel.configureProtocolV2(protocolV2Schema);
    lowlevel.configureProtocolV2(protocolV2Schema);

    expect(invalidateAllLinks).not.toHaveBeenCalled();

    lowlevel.configureProtocolV2({
      nested: {
        ...protocolV2Schema.nested,
        ExtraMessage: { fields: {} },
      },
    });

    expect(invalidateAllLinks).toHaveBeenCalledWith('Protocol V2 schema reconfigured');
  });

  test('keeps Protocol V1 raw notification chunks compatible', async () => {
    const responseChunks = ProtocolV1.encodeTransportPackets(schemas.protocolV1, 'Success', {
      message: 'ok',
    }).map(chunk => chunk.toString('hex'));
    const plugin = createPlugin({
      devices: [{ id: 'classic-id', name: 'OneKey Classic', commType: 'ble' }],
      responses: [...responseChunks, ...responseChunks],
    });
    const lowlevel = configureTransport(plugin);

    await expect(lowlevel.acquire({ uuid: 'classic-id' })).resolves.toEqual({
      uuid: 'classic-id',
      protocolType: 'V1',
    });
    await expect(lowlevel.call('classic-id', 'Initialize', {})).resolves.toEqual({
      type: 'Success',
      message: { message: 'ok' },
    });
  });

  test('uses 192-byte packets for Protocol V2 BLE writes', async () => {
    const plugin = createPlugin({ devices: [], responses: [] });
    const lowlevel = configureTransport(plugin);
    const context = {
      messageName: 'Ping',
      timeoutMs: 1000,
      highThroughput: false,
      generation: 1,
      signal: new AbortController().signal,
    };

    await lowlevel.writeProtocolV2Frame('pro2-id', new Uint8Array(386), context, jest.fn());

    expect(plugin.send).toHaveBeenCalledTimes(3);
    expect(plugin.send.mock.calls.map(([, hex]) => hex.length / 2)).toEqual([192, 192, 2]);
  });

  test('uses the packet capacity reported after BLE connection', async () => {
    const plugin = createPlugin({ devices: [], responses: [] });
    plugin.getProtocolV2PacketCapacity = jest.fn().mockResolvedValue(244);
    const lowlevel = configureTransport(plugin);
    lowlevel.detectProtocol = jest.fn().mockResolvedValue('V2');
    const context = {
      messageName: 'Ping',
      timeoutMs: 1000,
      highThroughput: false,
      generation: 1,
      signal: new AbortController().signal,
    };

    await lowlevel.acquire({ uuid: 'pro2-id', expectedProtocol: 'V2' });
    await lowlevel.writeProtocolV2Frame('pro2-id', new Uint8Array(386), context, jest.fn());

    expect(plugin.getProtocolV2PacketCapacity).toHaveBeenCalledWith('pro2-id');
    expect(plugin.send.mock.calls.map(([, hex]) => hex.length / 2)).toEqual([244, 142]);
  });

  test('rejects calls before protocol detection', async () => {
    const responseChunks = ProtocolV1.encodeTransportPackets(schemas.protocolV1, 'Success', {
      message: 'ok',
    }).map(chunk => chunk.toString('hex'));
    const plugin = createPlugin({
      devices: [{ id: 'classic-id', name: 'OneKey Classic', commType: 'ble' }],
      responses: responseChunks,
    });
    const lowlevel = configureTransport(plugin);

    await expect(lowlevel.call('classic-id', 'Initialize', {})).rejects.toThrow(
      'Device protocol has not been detected'
    );
  });

  test('detects Protocol V2 devices and reassembles split Protocol V2 notifications', async () => {
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );
    const callResponse = ProtocolV2.encodeFrame(
      schemas,
      'ProtocolInfo',
      {
        version: 1,
        supported_messages: [60200, 60201, 60206, 60207],
        protobuf_definition: 'onekey-protocol-v2',
      },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: 2 }
    );
    const plugin = createPlugin({
      devices: [{ id: 'pro2-id', name: 'OneKey Pro 2', commType: 'ble' }],
      responses: [
        new Error('Protocol V1 probe timed out'),
        ...splitFrame(probeResponse, 4),
        ...splitFrame(callResponse, 5),
      ],
    });
    const lowlevel = configureTransport(plugin);

    await expect(lowlevel.enumerate()).resolves.toEqual([
      { id: 'pro2-id', name: 'OneKey Pro 2', commType: 'ble' },
    ]);
    await expect(lowlevel.acquire({ uuid: 'pro2-id' })).resolves.toEqual({
      uuid: 'pro2-id',
      protocolType: 'V2',
    });
    await expect(lowlevel.call('pro2-id', 'ProtocolInfoRequest', {})).resolves.toEqual({
      type: 'ProtocolInfo',
      message: {
        version: 1,
        supported_messages: [60200, 60201, 60206, 60207],
        protobuf_definition: 'onekey-protocol-v2',
      },
    });
    expect(plugin.send).toHaveBeenCalled();
    const sentSeqs = plugin.send.mock.calls
      .map(([, hex]) => Number.parseInt(hex.slice(12, 14), 16))
      .filter(seq => seq > 0);
    expect(sentSeqs).toEqual([1, 2]);
  });

  test('falls back to Protocol V2 probe for unnamed Protocol V2 devices', async () => {
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );
    const plugin = createPlugin({
      devices: [{ id: 'unknown-pro2-id', name: 'Unknown BLE Device', commType: 'ble' }],
      responses: [new Error('Protocol V1 probe timed out'), bytesToHex(probeResponse)],
    });
    const lowlevel = configureTransport(plugin);

    await expect(lowlevel.acquire({ uuid: 'unknown-pro2-id' })).resolves.toEqual({
      uuid: 'unknown-pro2-id',
      protocolType: 'V2',
    });
    expect(lowlevel.getProtocolType('unknown-pro2-id')).toBe('V2');
  });

  test('detects Protocol V2 again after release without a name-derived hint', async () => {
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );
    const plugin = createPlugin({
      devices: [{ id: 'reconnect-pro2-id', name: 'OneKey Pro 2', commType: 'ble' }],
      responses: [
        new Error('Protocol V1 probe timed out'),
        bytesToHex(probeResponse),
        new Error('Protocol V1 probe timed out'),
        bytesToHex(probeResponse),
      ],
    });
    const lowlevel = configureTransport(plugin);

    await lowlevel.enumerate();
    await expect(lowlevel.acquire({ uuid: 'reconnect-pro2-id' })).resolves.toEqual({
      uuid: 'reconnect-pro2-id',
      protocolType: 'V2',
    });
    await lowlevel.release('reconnect-pro2-id');
    await expect(lowlevel.acquire({ uuid: 'reconnect-pro2-id' })).resolves.toEqual({
      uuid: 'reconnect-pro2-id',
      protocolType: 'V2',
    });

    const sentSeqs = plugin.send.mock.calls
      .map(([, hex]) => Number.parseInt(hex.slice(12, 14), 16))
      .filter(seq => seq > 0);
    expect(sentSeqs).toEqual([1, 2]);
  });

  test('reuses the active generation when Core acquires the same BLE connection again', async () => {
    const responses = [1, 2, 3, 4].map(seq =>
      bytesToHex(
        ProtocolV2.encodeFrame(
          schemas,
          'Success',
          { message: 'ok' },
          { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq }
        )
      )
    );
    const plugin = createPlugin({
      devices: [{ id: 'repeated-acquire-id', name: 'OneKey Pro 2', commType: 'ble' }],
      responses,
    });
    const lowlevel = configureTransport(plugin);

    await expect(
      lowlevel.acquire({ uuid: 'repeated-acquire-id', expectedProtocol: 'V2' })
    ).resolves.toEqual({
      uuid: 'repeated-acquire-id',
      protocolType: 'V2',
    });
    await lowlevel.call('repeated-acquire-id', 'Ping', { message: 'first-acquire' });
    await expect(
      lowlevel.acquire({ uuid: 'repeated-acquire-id', expectedProtocol: 'V2' })
    ).resolves.toEqual({
      uuid: 'repeated-acquire-id',
      protocolType: 'V2',
    });
    await lowlevel.call('repeated-acquire-id', 'Ping', { message: 'second-acquire' });

    const sentSeqs = plugin.send.mock.calls.map(([, hex]) =>
      Number.parseInt(hex.slice(12, 14), 16)
    );
    expect(sentSeqs).toEqual([1, 2, 3, 4]);
  });

  test('actively probes explicit Protocol V2 during bootloader reconnect', async () => {
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );
    const plugin = createPlugin({
      devices: [{ id: 'bootloader-v2-id', name: 'OneKey Pro 2', commType: 'ble' }],
      responses: [bytesToHex(probeResponse)],
    });
    const lowlevel = configureTransport(plugin);

    await expect(
      lowlevel.acquire({ uuid: 'bootloader-v2-id', expectedProtocol: 'V2' })
    ).resolves.toEqual({
      uuid: 'bootloader-v2-id',
      protocolType: 'V2',
    });
    expect(plugin.send).toHaveBeenCalledTimes(1);
    expect(plugin.receive).toHaveBeenCalledTimes(1);
  });

  test('disconnects and clears a lowlevel connection when Protocol V2 reports link disabled', async () => {
    const failureResponse = ProtocolV2.encodeFrame(
      schemas,
      'Failure',
      { code: 5, message: 'link disabled' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );
    const plugin = createPlugin({
      devices: [{ id: 'usb-owned-id', name: 'OneKey Pro 2', commType: 'ble' }],
      responses: [bytesToHex(failureResponse)],
    });
    const lowlevel = configureTransport(plugin);

    await expect(
      lowlevel.acquire({ uuid: 'usb-owned-id', expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      name: 'ProtocolV2LinkDisabledError',
      failureCode: 5,
      firmwareMessage: 'link disabled',
    });

    expect(plugin.disconnect).toHaveBeenCalledWith('usb-owned-id');
    expect(lowlevel.connectedDevices.has('usb-owned-id')).toBe(false);
    expect(lowlevel.getProtocolType('usb-owned-id')).toBeUndefined();
    expect(lowlevel.protocolV2Assemblers.has('usb-owned-id')).toBe(false);
  });

  test('resets the lowlevel connection before probing Protocol V2 after a V1 timeout', async () => {
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );
    let staleReceivePending = false;
    let resetAfterTimeout = false;
    const plugin = createPlugin({
      devices: [{ id: 'slow-v2-id', name: 'Unknown BLE Device', commType: 'ble' }],
      responses: [],
    });
    plugin.disconnect.mockImplementation(() => {
      staleReceivePending = false;
      resetAfterTimeout = true;
      return Promise.resolve();
    });
    plugin.receive.mockImplementation(() => {
      if (!staleReceivePending && !resetAfterTimeout) {
        staleReceivePending = true;
        return new Promise(() => {});
      }
      if (staleReceivePending) {
        return Promise.reject(new Error('stale receive still pending'));
      }
      return Promise.resolve(bytesToHex(probeResponse));
    });
    const lowlevel = configureTransport(plugin);

    await expect(lowlevel.acquire({ uuid: 'slow-v2-id' })).resolves.toEqual({
      uuid: 'slow-v2-id',
      protocolType: 'V2',
    });
    expect(plugin.disconnect).toHaveBeenCalledWith('slow-v2-id');
    expect(plugin.connect).toHaveBeenCalledTimes(2);
  });

  test('disconnects a tainted Protocol V2 link after a response timeout', async () => {
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );
    const plugin = createPlugin({
      devices: [{ id: 'timeout-v2-id', name: 'OneKey Pro 2', commType: 'ble' }],
      responses: [bytesToHex(probeResponse)],
    });
    let receiveCount = 0;
    plugin.receive.mockImplementation(() => {
      receiveCount += 1;
      return receiveCount === 1
        ? Promise.resolve(bytesToHex(probeResponse))
        : new Promise(() => {});
    });
    const lowlevel = configureTransport(plugin);

    await lowlevel.acquire({ uuid: 'timeout-v2-id', expectedProtocol: 'V2' });
    plugin.disconnect.mockClear();
    await expect(
      lowlevel.call('timeout-v2-id', 'Ping', { message: 'timeout' }, { timeoutMs: 10 })
    ).rejects.toThrow('Lowlevel response timeout after 10ms for Ping');

    expect(plugin.disconnect).toHaveBeenCalledWith('timeout-v2-id');
  });

  test('preserves an undefined business timeout outside explicit probes', async () => {
    const plugin = createPlugin({
      devices: [{ id: 'v2-id', name: 'OneKey Pro 2', commType: 'ble' }],
      responses: [],
    });
    const lowlevel = configureTransport(plugin);
    lowlevel.deviceProtocol.set('v2-id', 'V2');
    const linkCall = jest
      .spyOn(lowlevel.protocolV2Links, 'call')
      .mockResolvedValue({ type: 'Success', message: {} });

    await lowlevel.call('v2-id', 'Ping', { message: 'no-business-timeout' });

    expect(linkCall).toHaveBeenCalledWith(
      'v2-id',
      expect.any(Function),
      'Ping',
      { message: 'no-business-timeout' },
      undefined
    );
  });

  test('verifies expected Protocol V1 instead of trusting the requested protocol', async () => {
    const plugin = createPlugin({
      devices: [{ id: 'v2-id', name: 'Unknown BLE Device', commType: 'ble' }],
      responses: [new Error('Protocol V1 probe timed out')],
    });
    const lowlevel = configureTransport(plugin);

    await expect(lowlevel.acquire({ uuid: 'v2-id', expectedProtocol: 'V1' })).rejects.toThrow(
      'Device protocol mismatch: expected V1'
    );
  });

  test('rejects automatic detection instead of caching V1 when both protocol probes fail', async () => {
    const plugin = createPlugin({
      devices: [{ id: 'flaky-pro2-id', name: 'Unknown BLE Device', commType: 'ble' }],
      responses: [
        new Error('Protocol V1 probe timed out'),
        new Error('Protocol V2 probe timed out'),
      ],
    });
    const lowlevel = configureTransport(plugin);

    await expect(lowlevel.acquire({ uuid: 'flaky-pro2-id' })).rejects.toThrow(
      'Unable to detect BLE protocol'
    );
    expect(lowlevel.getProtocolType('flaky-pro2-id')).toBeUndefined();
  });
});
