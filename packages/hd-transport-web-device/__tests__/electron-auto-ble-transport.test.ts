import ElectronAutoBleTransport from '../src/electron-auto-ble-transport';
import transport, {
  PROTOCOL_V2_CHANNEL_BLE_UART,
  bytesToHex,
} from '../../hd-transport/src';

const { ProtocolV2, parseConfigure } = transport;

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

  const transport = new ElectronAutoBleTransport();
  transport.init(createLogger());
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);
  return transport;
};

describe('ElectronAutoBleTransport protocol detection', () => {
  afterEach(() => {
    delete (global as any).window;
    jest.clearAllMocks();
  });

  test('rejects automatic detection instead of caching V1 when both protocol probes fail', async () => {
    const nobleBle = createNobleBle();
    const transport = configureTransport(nobleBle);

    try {
      await expect(transport.acquire({ uuid: 'flaky-pro2-id' })).rejects.toThrow(
        'Unable to detect BLE protocol'
      );
      expect((transport as any).deviceProtocol.has('flaky-pro2-id')).toBe(false);
    } finally {
      await transport.release('flaky-pro2-id');
    }
  });

  test('detects Protocol V2 after Protocol V1 probe timeout', async () => {
    const device = { id: 'unknown-pro2-id', name: 'Unknown BLE Device' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    let writeCount = 0;
    const probeResponse = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      {
        message: 'probe',
      },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART }
    );

    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    nobleBle.write.mockImplementation(() => {
      writeCount += 1;
      if (writeCount > 1) {
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

  test('rejects calls before protocol detection instead of defaulting to Protocol V1', async () => {
    const nobleBle = createNobleBle();
    const transport = configureTransport(nobleBle);
    (transport as any).connectedDevices.add('flaky-pro2-id');

    await expect(transport.call('flaky-pro2-id', 'Initialize', {})).rejects.toThrow(
      'Device protocol has not been detected'
    );
  });
});
