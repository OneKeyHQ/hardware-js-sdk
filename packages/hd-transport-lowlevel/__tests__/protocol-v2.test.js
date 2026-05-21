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
    MessageType: {
      values: {
        MessageType_GetProtoVersion: 60200,
        MessageType_ProtoVersion: 60201,
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
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
  test('keeps Protocol V1 raw notification chunks compatible', async () => {
    const responseChunks = ProtocolV1.encodeTransportPackets(schemas.protocolV1, 'Success', {
      message: 'ok',
    }).map(chunk => chunk.toString('hex'));
    const plugin = createPlugin({
      devices: [{ id: 'classic-id', name: 'OneKey Classic', commType: 'ble' }],
      responses: responseChunks,
    });
    const lowlevel = configureTransport(plugin);

    await expect(lowlevel.call('classic-id', 'Initialize', {})).resolves.toEqual({
      type: 'Success',
      message: { message: 'ok' },
    });
  });

  test('detects Protocol V2 devices and reassembles split Protocol V2 notifications', async () => {
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      {
        message: 'probe',
      },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );
    const callResponse = ProtocolV2.encodeFrame(
      schemas,
      'ProtoVersion',
      {
        major_version: 2,
        minor_version: 1,
        patch_version: 3,
      },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );
    const plugin = createPlugin({
      devices: [{ id: 'pro2-id', name: 'OneKey Pro 2', commType: 'ble' }],
      responses: [...splitFrame(probeResponse, 4), ...splitFrame(callResponse, 5)],
    });
    const lowlevel = configureTransport(plugin);

    await expect(lowlevel.enumerate()).resolves.toEqual([
      { id: 'pro2-id', name: 'OneKey Pro 2', commType: 'ble' },
    ]);
    await expect(lowlevel.acquire({ uuid: 'pro2-id' })).resolves.toEqual({
      uuid: 'pro2-id',
      protocolType: 'V2',
    });
    await expect(lowlevel.call('pro2-id', 'GetProtoVersion', {})).resolves.toEqual({
      type: 'ProtoVersion',
      message: {
        major_version: 2,
        minor_version: 1,
        patch_version: 3,
      },
    });
    expect(plugin.send).toHaveBeenCalled();
  });

  test('falls back to Protocol V2 probe for unnamed Protocol V2 devices', async () => {
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      {
        message: 'probe',
      },
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

  test('resets the lowlevel connection before probing Protocol V2 after a V1 timeout', async () => {
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      {
        message: 'probe',
      },
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
});
