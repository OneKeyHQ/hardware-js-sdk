import transport, { PROTOCOL_V2_CHANNEL_BLE_UART, bytesToHex } from '@onekeyfe/hd-transport';

import ElectronBleTransport from '../src/electron-ble-transport';

const { ProtocolV1, ProtocolV2, parseConfigure } = transport;

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
    MessageType: {
      values: {
        MessageType_ProtocolInfoRequest: 60200,
        MessageType_ProtocolInfo: 60201,
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

jest.setTimeout(10_000);

const createLogger = () => ({
  debug: jest.fn(),
  error: jest.fn(),
});

const createNobleBle = (device = { id: 'flaky-pro2-id', name: 'Unknown BLE Device' }) => ({
  enumerate: jest.fn(() => Promise.resolve([device])),
  getDevice: jest.fn(() => Promise.resolve(device)),
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  subscribe: jest.fn(() => Promise.resolve()),
  unsubscribe: jest.fn(() => Promise.resolve()),
  write: jest.fn(() => Promise.resolve()),
  onNotification: jest.fn(() => jest.fn()),
  onDeviceDisconnected: jest.fn(() => jest.fn()),
  checkAvailability: jest.fn(() =>
    Promise.resolve({
      available: true,
      state: 'poweredOn',
      unsupported: false,
      initialized: true,
    })
  ),
});

const configureTransport = (nobleBle: ReturnType<typeof createNobleBle>) => {
  (global as any).window = {
    desktopApi: {
      nobleBle,
    },
  };

  const transport = new ElectronBleTransport();
  transport.init(createLogger());
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);
  return transport;
};

describe('ElectronBleTransport protocol detection', () => {
  afterEach(() => {
    delete (global as any).window;
    jest.clearAllMocks();
  });

  test('detects Protocol V2 after Protocol V1 probe timeout', async () => {
    const device = { id: 'unknown-pro2-id', name: 'Unknown BLE Device' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );

    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    let writeCount = 0;
    nobleBle.write.mockImplementation(() => {
      writeCount += 1;
      if (writeCount === 2) {
        setTimeout(() => notificationHandler?.(device.id, bytesToHex(probeResponse)), 0);
      }
      return Promise.resolve();
    });
    const transport = configureTransport(nobleBle);

    try {
      await expect(transport.acquire({ uuid: device.id })).resolves.toEqual(
        expect.objectContaining({
          uuid: device.id,
          protocolType: 'V2',
        })
      );
      expect(transport.getProtocolType(device.id)).toBe('V2');
    } finally {
      await transport.release(device.id);
    }
  });

  test('detects Protocol V1 when device responds to Initialize', async () => {
    const device = { id: 'classic-id', name: 'OneKey Classic' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;

    // Build a V1 Success notification (no 64-byte padding, matching real BLE behaviour).
    // Format: ?## (3f2323) + typeId BE (0002) + length BE (00000004) + protobuf payload (0a026f6b)
    const v1ResponseHex = '3f23230002000000040a026f6b';

    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    nobleBle.write.mockImplementation(() => {
      // Respond to first write (V1 Initialize probe) with V1 Success
      setTimeout(() => notificationHandler?.(device.id, v1ResponseHex), 0);
      return Promise.resolve();
    });
    const transport = configureTransport(nobleBle);

    try {
      await expect(transport.acquire({ uuid: device.id })).resolves.toEqual(
        expect.objectContaining({
          uuid: device.id,
        })
      );
      expect(transport.getProtocolType(device.id)).toBe('V1');
    } finally {
      await transport.release(device.id);
    }
  });

  test('throws when both protocol probes fail', async () => {
    const device = { id: 'dead-device-id', name: 'Unknown Device' };
    const nobleBle = createNobleBle(device);

    // Never respond to writes — both probes will timeout
    nobleBle.onNotification.mockImplementation(() => jest.fn());

    const transport = configureTransport(nobleBle);

    await expect(transport.acquire({ uuid: device.id })).rejects.toThrow(
      /Unable to detect BLE protocol/
    );
    expect(transport.getProtocolType(device.id)).toBeUndefined();
  });

  test('probes Protocol V2 instead of trusting the Pro2 name hint', async () => {
    const device = { id: 'named-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );

    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    nobleBle.write.mockImplementation(() => {
      setTimeout(() => notificationHandler?.(device.id, bytesToHex(probeResponse)), 0);
      return Promise.resolve();
    });
    const transport = configureTransport(nobleBle);

    try {
      await expect(transport.acquire({ uuid: device.id })).resolves.toEqual(
        expect.objectContaining({
          uuid: device.id,
          protocolType: 'V2',
        })
      );
      expect(nobleBle.write).toHaveBeenCalledTimes(1);
      expect(transport.getProtocolType(device.id)).toBe('V2');
    } finally {
      await transport.release(device.id);
    }
  });
});
