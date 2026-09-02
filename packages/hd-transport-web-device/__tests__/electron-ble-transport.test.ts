import transport, { PROTOCOL_V2_CHANNEL_BLE_UART, bytesToHex } from '@onekeyfe/hd-transport';
import { EBleDisconnectReason, HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';
import EventEmitter from 'events';

import ElectronBleTransport from '../src/electron-ble-transport';

const { ProtocolV1, ProtocolV2, parseConfigure } = transport;

const protocolV1Schema = {
  nested: {
    Initialize: {
      fields: {},
    },
    GetFeatures: {
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
        MessageType_GetFeatures: 55,
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
          type: 'FailureType',
          id: 1,
        },
        message: {
          type: 'string',
          id: 2,
        },
      },
    },
    FailureType: {
      values: {
        Failure_ProcessError: 5,
      },
    },
    MessageType: {
      values: {
        MessageType_Failure: 3,
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
  onMtuChanged: jest.fn(() => jest.fn()),
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

const configureTransport = (
  nobleBle: ReturnType<typeof createNobleBle>,
  emitter?: EventEmitter
) => {
  (global as any).window = {
    desktopApi: {
      nobleBle,
    },
  };

  const transport = new ElectronBleTransport();
  transport.init(createLogger(), emitter);
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);
  return transport;
};

/**
 * Wire the mock so acquire()'s Protocol V2 probe gets an answer. Without it
 * detectProtocol throws and the test never reaches the disconnect behaviour.
 */
const echoProtocolV2 = (nobleBle: ReturnType<typeof createNobleBle>, deviceId: string) => {
  let notificationHandler: ((id: string, data: string) => void) | undefined;
  nobleBle.onNotification.mockImplementation(handler => {
    notificationHandler = handler;
    return jest.fn();
  });
  let responseSeq = 0;
  nobleBle.write.mockImplementation(() => {
    responseSeq += 1;
    const response = ProtocolV2.encodeFrame(
      schemas,
      'Success',
      { message: 'ok' },
      { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: responseSeq }
    );
    setTimeout(() => notificationHandler?.(deviceId, bytesToHex(response)), 0);
    return Promise.resolve();
  });
};

describe('ElectronBleTransport protocol detection', () => {
  afterEach(() => {
    delete (global as any).window;
    jest.clearAllMocks();
  });

  test('keeps raw BLE lifecycle payloads off the public device event channel', async () => {
    const device = { id: 'lifecycle-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const emitter = new EventEmitter();
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    let disconnectHandler: ((device: { id: string; name: string | null }) => void) | undefined;
    let responseSeq = 0;

    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    nobleBle.onDeviceDisconnected.mockImplementation(handler => {
      disconnectHandler = handler;
      return jest.fn();
    });
    nobleBle.write.mockImplementation(() => {
      responseSeq += 1;
      const response = ProtocolV2.encodeFrame(
        schemas,
        'Success',
        { message: 'ok' },
        { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: responseSeq }
      );
      setTimeout(() => notificationHandler?.(device.id, bytesToHex(response)), 0);
      return Promise.resolve();
    });

    const publicConnect = jest.fn();
    const publicDisconnect = jest.fn();
    const transportDisconnect = jest.fn();
    emitter.on('device-connect', publicConnect);
    emitter.on('device-disconnect', publicDisconnect);
    emitter.on('transport-device-disconnect', transportDisconnect);
    const bleTransport = configureTransport(nobleBle, emitter);

    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    expect(nobleBle.subscribe.mock.invocationCallOrder[0]).toBeLessThan(
      nobleBle.getDevice.mock.invocationCallOrder[1]
    );
    disconnectHandler?.(device);

    expect(publicConnect).not.toHaveBeenCalled();
    expect(publicDisconnect).not.toHaveBeenCalled();
    expect(transportDisconnect).toHaveBeenCalledWith({
      id: device.id,
      connectId: device.id,
      name: device.name,
    });
  });

  test('uses the Protocol V2 BLE writer with the Electron packet size', async () => {
    const device = { id: 'chunked-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const bleTransport = configureTransport(nobleBle) as any;
    const context = {
      messageName: 'Ping',
      timeoutMs: 1000,
      highThroughput: false,
      generation: 1,
      signal: new AbortController().signal,
    };

    await bleTransport.writeProtocolV2Frame(device.id, new Uint8Array(193), context, jest.fn());

    expect(nobleBle.write).toHaveBeenCalledTimes(2);
    expect(nobleBle.write.mock.calls.map(([, hex]) => hex.length / 2)).toEqual([192, 1]);
    expect(nobleBle.write.mock.calls.every(([, , options]) => options?.pacingDelayMs === 0)).toBe(
      true
    );
  });

  test('uses the negotiated Noble MTU for Protocol V2 BLE writes', async () => {
    const device = { id: 'mtu-pro2-id', name: 'OneKey Pro 2', mtu: 247 };
    const nobleBle = createNobleBle(device);
    const bleTransport = configureTransport(nobleBle) as any;
    const context = {
      messageName: 'FilesystemFileWrite',
      timeoutMs: 1000,
      highThroughput: true,
      generation: 1,
      signal: new AbortController().signal,
    };

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    try {
      await bleTransport.refreshBlePacketCapacity(device.id);
      await bleTransport.writeProtocolV2Frame(device.id, new Uint8Array(245), context, jest.fn());

      expect(setTimeoutSpy).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
    }

    expect(nobleBle.write).toHaveBeenCalledTimes(2);
    expect(nobleBle.write.mock.calls.map(([, hex]) => hex.length / 2)).toEqual([244, 1]);
  });

  test('updates Protocol V2 packet capacity when Noble reports a new MTU', async () => {
    const device = { id: 'mtu-event-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    let mtuHandler: ((changedDevice: { id: string; mtu: number }) => void) | undefined;
    nobleBle.onMtuChanged.mockImplementation(handler => {
      mtuHandler = handler;
      return jest.fn();
    });
    const bleTransport = configureTransport(nobleBle) as any;
    const context = {
      messageName: 'FilesystemFileWrite',
      timeoutMs: 1000,
      highThroughput: true,
      generation: 1,
      signal: new AbortController().signal,
    };

    bleTransport.createMtuSubscription(device.id);
    mtuHandler?.({ id: device.id, mtu: 247 });
    await bleTransport.writeProtocolV2Frame(device.id, new Uint8Array(245), context, jest.fn());

    expect(nobleBle.write.mock.calls.map(([, hex]) => hex.length / 2)).toEqual([244, 1]);
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
      expect(nobleBle.connect).toHaveBeenCalledTimes(1);
      expect(nobleBle.subscribe).toHaveBeenCalledTimes(1);
      expect(nobleBle.unsubscribe).not.toHaveBeenCalled();
      expect(nobleBle.disconnect).not.toHaveBeenCalled();
    } finally {
      await transport.release(device.id);
    }
  });

  test('reconnects a declared Protocol V1 device without probing again', async () => {
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
      // The first write is the V1 GetFeatures probe; answer with a V1 Success response.
      setTimeout(() => notificationHandler?.(device.id, v1ResponseHex), 0);
      return Promise.resolve();
    });
    const transport = configureTransport(nobleBle);
    const protocolV2Writer = jest.spyOn(transport as any, 'writeProtocolV2Frame');

    try {
      await expect(transport.acquire({ uuid: device.id })).resolves.toEqual(
        expect.objectContaining({
          uuid: device.id,
        })
      );
      expect(transport.getProtocolType(device.id)).toBe('V1');
      await expect(transport.acquire({ uuid: device.id, expectedProtocol: 'V1' })).resolves.toEqual(
        expect.objectContaining({
          uuid: device.id,
        })
      );
      // The first acquire probes because the protocol is unknown; the second
      // declares V1 and must send nothing at all, leaving the first frame on
      // the link to Core — which is what carries the wallet session.
      expect(nobleBle.write).toHaveBeenCalledTimes(1);
      expect(nobleBle.write.mock.calls.every(([, hex]) => /^3f23230037/.test(hex))).toBe(true);
      expect(protocolV2Writer).not.toHaveBeenCalled();
    } finally {
      await transport.release(device.id);
    }
  });

  test('invalidates and disconnects a Protocol V1 link after a response timeout', async () => {
    const device = { id: 'classic-timeout-id', name: 'OneKey Classic' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    const v1ResponseHex = '3f23230002000000040a026f6b';
    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    // A declared V1 acquire writes nothing, so every write here belongs to the
    // call under test and none of them is answered.
    nobleBle.write.mockImplementation(() => Promise.resolve());
    const bleTransport = configureTransport(nobleBle);

    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V1' });
    await expect(
      bleTransport.call(device.id, 'Initialize', {}, { timeoutMs: 5 })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.BleTimeoutError });

    expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
    expect(bleTransport.getProtocolType(device.id)).toBeUndefined();
  });

  test('keeps another device V2 reader when force-cleaning a V1 call', async () => {
    const device = { id: 'classic-force-clean-id', name: 'OneKey Classic' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    const v1ResponseHex = '3f23230002000000040a026f6b';
    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    nobleBle.write.mockImplementation(() => {
      setTimeout(() => notificationHandler?.(device.id, v1ResponseHex), 0);
      return Promise.resolve();
    });
    const bleTransport = configureTransport(nobleBle) as any;
    const activeV1Call = createDeferred<string>();
    const otherDeviceReader = createDeferred<Uint8Array>();
    activeV1Call.promise.catch(() => undefined);
    otherDeviceReader.promise.catch(() => undefined);
    bleTransport.runPromise = activeV1Call;
    bleTransport.v2FramePromises.set('device-b', otherDeviceReader);

    await bleTransport.acquire({
      uuid: device.id,
      expectedProtocol: 'V1',
      forceCleanRunPromise: true,
    });

    expect(bleTransport.v2FramePromises.get('device-b')).toBe(otherDeviceReader);
    await bleTransport.release(device.id);
  });

  test('rejects a pending V2 reader when its device frame state resets', async () => {
    const nobleBle = createNobleBle();
    const bleTransport = configureTransport(nobleBle) as any;
    const reader = createDeferred<Uint8Array>();
    bleTransport.v2FramePromises.set('device-a', reader);
    const result = Promise.race([
      reader.promise.then(
        () => 'resolved',
        () => 'rejected'
      ),
      new Promise(resolve => {
        setTimeout(() => resolve('pending'), 20);
      }),
    ]);

    bleTransport.resetProtocolV2Frames('device-a');

    await expect(result).resolves.toBe('rejected');
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

  test('surfaces Protocol V2 link disabled while the initial V1 probe is active', async () => {
    const device = { id: 'usb-priority-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;

    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    nobleBle.write.mockImplementation(() => {
      const response = ProtocolV2.encodeFrame(
        schemas,
        'Failure',
        { code: 5, message: 'link disabled' },
        { router: PROTOCOL_V2_CHANNEL_BLE_UART }
      );
      const splitAt = 4;
      setTimeout(() => {
        notificationHandler?.(device.id, bytesToHex(response.subarray(0, splitAt)));
        notificationHandler?.(device.id, bytesToHex(response.subarray(splitAt)));
      }, 0);
      return Promise.resolve();
    });
    const transport = configureTransport(nobleBle);

    await expect(transport.acquire({ uuid: device.id })).rejects.toMatchObject({
      name: 'ProtocolV2LinkDisabledError',
      failureCode: 'Failure_ProcessError',
      firmwareMessage: 'link disabled',
    });
    expect(nobleBle.write).toHaveBeenCalledTimes(1);
    expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
  });

  test('keeps a first expected Protocol V2 probe miss retryable', async () => {
    const device = { id: 'first-v2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const transport = configureTransport(nobleBle);
    jest.spyOn(transport as any, 'probeProtocolV2').mockResolvedValue(false);

    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });

    expect(nobleBle.connect).toHaveBeenCalledTimes(1);
    expect(transport.getProtocolType(device.id)).toBeUndefined();
  });

  test('keeps a second expected Protocol V2 probe miss retryable', async () => {
    const device = { id: 'retry-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const transport = configureTransport(nobleBle);
    jest.spyOn(transport as any, 'probeProtocolV2').mockResolvedValue(false);

    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });
    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });

    expect(transport.getProtocolType(device.id)).toBeUndefined();
  });

  test('fails Protocol V2 acquire immediately when subscribe reports insufficient encryption', async () => {
    const device = { id: 'stale-bond-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    nobleBle.subscribe.mockRejectedValue(new Error('Encryption is insufficient'));
    const transport = configureTransport(nobleBle);
    const probe = jest.spyOn(transport as any, 'probeProtocolV2');

    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleDeviceBondError,
    });

    expect(probe).not.toHaveBeenCalled();
    expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
  });

  test('maps macOS CoreBluetooth peer-removed pairing failures to the precise error', async () => {
    const device = { id: 'reset-pro2-macos-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    nobleBle.connect.mockRejectedValue(
      new Error('CBErrorDomain:14 Peer removed pairing information on the device side')
    );
    const transport = configureTransport(nobleBle);

    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BlePeerRemovedPairingInformation,
    });
  });

  test('does not classify a generic macOS connection failure as a stale bond', async () => {
    const device = { id: 'offline-pro2-macos-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    nobleBle.connect.mockRejectedValue(new Error('connection failed'));
    const transport = configureTransport(nobleBle);

    try {
      await transport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
      throw new Error('Expected acquire to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('connection failed');
      expect((error as { errorCode?: unknown }).errorCode).toBeUndefined();
    }
  });

  test('keeps stale-bond subscribe mapping out of Protocol V1 acquire', async () => {
    const device = { id: 'classic-v1-id', name: 'OneKey Classic' };
    const nobleBle = createNobleBle(device);
    nobleBle.subscribe.mockRejectedValue(new Error('Encryption is insufficient'));
    const transport = configureTransport(nobleBle);

    try {
      await transport.acquire({ uuid: device.id, expectedProtocol: 'V1' });
      throw new Error('Expected Protocol V1 acquire to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Encryption is insufficient');
      expect((error as { errorCode?: unknown }).errorCode).toBeUndefined();
    }
  });

  test('reports a stale bond when a previously confirmed Protocol V2 device stops responding', async () => {
    const device = { id: 'reset-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const transport = configureTransport(nobleBle);
    const probe = jest.spyOn(transport as any, 'probeProtocolV2').mockResolvedValue(true);

    await transport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    await transport.release(device.id);
    probe.mockResolvedValue(false);

    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleDeviceBondError,
    });

    expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
    expect(transport.getProtocolType(device.id)).toBeUndefined();
  });

  test('does not take a Protocol V2 hint from the BLE name', async () => {
    const device = { id: 'named-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;

    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    let responseSeq = 0;
    nobleBle.write.mockImplementation(() => {
      responseSeq += 1;
      const response = ProtocolV2.encodeFrame(
        schemas,
        'Success',
        { message: 'ok' },
        { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: responseSeq }
      );
      setTimeout(() => notificationHandler?.(device.id, bytesToHex(response)), 0);
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
      expect(nobleBle.write.mock.calls.length).toBeGreaterThan(1);
      expect(transport.getProtocolType(device.id)).toBe('V2');
      await expect(transport.call(device.id, 'Ping', { message: 'after-probe' })).resolves.toEqual({
        type: 'Success',
        message: { message: 'ok' },
      });
      const sentSeqs = nobleBle.write.mock.calls
        .map(([, hex]) => Number.parseInt(hex.slice(12, 14), 16))
        .filter(seq => seq > 0);
      expect(sentSeqs).toEqual([1, 2]);
    } finally {
      await transport.release(device.id);
    }
  });

  test('rejects the active Protocol V2 reader when pairing is rejected', async () => {
    const device = { id: 'pairing-rejected-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    let pairingRejected = false;
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
      setTimeout(
        () =>
          notificationHandler?.(
            device.id,
            pairingRejected ? 'PAIRING_REJECTED' : bytesToHex(probeResponse)
          ),
        0
      );
      return Promise.resolve();
    });
    const transport = configureTransport(nobleBle);

    try {
      await transport.acquire({ uuid: device.id });
      pairingRejected = true;

      await expect(
        transport.call(device.id, 'Ping', { message: 'pairing' }, { timeoutMs: 50 })
      ).rejects.toMatchObject({ errorCode: HardwareErrorCode.BleDeviceBondedCanceled });
    } finally {
      await transport.release(device.id);
    }
  });

  test('rebuilds the active link when Core acquires the same device again', async () => {
    const device = { id: 'repeated-acquire-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    let responseSeq = 0;
    nobleBle.write.mockImplementation(() => {
      responseSeq += 1;
      const sequencedResponse = ProtocolV2.encodeFrame(
        schemas,
        'Success',
        { message: 'ok' },
        { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: responseSeq }
      );
      setTimeout(() => notificationHandler?.(device.id, bytesToHex(sequencedResponse)), 0);
      return Promise.resolve();
    });
    const transport = configureTransport(nobleBle);

    try {
      await transport.acquire({ uuid: device.id });
      await transport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
      await expect(
        transport.call(device.id, 'Ping', { message: 'after-reacquire' })
      ).resolves.toEqual({
        type: 'Success',
        message: { message: 'ok' },
      });

      const sentSeqs = nobleBle.write.mock.calls
        .map(([, hex]) => Number.parseInt(hex.slice(12, 14), 16))
        .filter(seq => seq > 0);
      expect(sentSeqs).toEqual([1, 2, 3]);
    } finally {
      await transport.release(device.id);
    }
  });

  test('subscribes to host disconnects once for the transport lifetime', async () => {
    // The previous design registered a listener inside every acquire() and
    // overwrote the cleanup entry without disposing the old one, so each
    // acquire leaked a live handler and a delayed event from a superseded
    // connection could tear down the current one. One transport-lifetime
    // subscription removes that whole class of bug.
    const device = { id: 'single-subscription-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    let responseSeq = 0;
    nobleBle.write.mockImplementation(() => {
      responseSeq += 1;
      const response = ProtocolV2.encodeFrame(
        schemas,
        'Success',
        { message: 'ok' },
        { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: responseSeq }
      );
      setTimeout(() => notificationHandler?.(device.id, bytesToHex(response)), 0);
      return Promise.resolve();
    });
    const bleTransport = configureTransport(nobleBle);

    try {
      expect(nobleBle.onDeviceDisconnected).toHaveBeenCalledTimes(1);

      await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
      await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });

      expect(nobleBle.onDeviceDisconnected).toHaveBeenCalledTimes(1);
      expect(bleTransport.getProtocolType(device.id)).toBe('V2');
      await expect(
        bleTransport.call(device.id, 'Ping', { message: 'after-reacquire' })
      ).resolves.toEqual({
        type: 'Success',
        message: { message: 'ok' },
      });
    } finally {
      await bleTransport.release(device.id);
    }
  });

  test('reports a device that drops after a logical release (OK-60486)', async () => {
    // A logical release keeps the native link alive for the keep-alive window.
    // A drop during that window must still reach consumers, or the UI keeps
    // showing the device as connected forever.
    const device = { id: 'idle-drop-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const emitter = new EventEmitter();
    let disconnectHandler:
      | ((d: { id: string; name: string; reason?: EBleDisconnectReason }) => void)
      | undefined;
    nobleBle.onDeviceDisconnected.mockImplementation(handler => {
      disconnectHandler = handler;
      return jest.fn();
    });
    echoProtocolV2(nobleBle, device.id);
    const transportDisconnect = jest.fn();
    emitter.on('transport-device-disconnect', transportDisconnect);
    const bleTransport = configureTransport(nobleBle, emitter);

    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    await bleTransport.release(device.id);

    disconnectHandler?.({ ...device, reason: EBleDisconnectReason.DeviceDisconnected });

    expect(transportDisconnect).toHaveBeenCalledWith({
      id: device.id,
      connectId: device.id,
      name: device.name,
    });
  });

  test('reports an idle keep-alive release as a device disconnect', async () => {
    // The main process reclaims idle links on its own timer. That is still a
    // closed link, and consumers track link liveness, so it is reported like
    // any other drop. Nothing reconnects on its own, so the state settles once
    // until the user acts.
    const device = { id: 'keep-alive-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const emitter = new EventEmitter();
    let disconnectHandler:
      | ((d: { id: string; name: string; reason?: EBleDisconnectReason }) => void)
      | undefined;
    nobleBle.onDeviceDisconnected.mockImplementation(handler => {
      disconnectHandler = handler;
      return jest.fn();
    });
    echoProtocolV2(nobleBle, device.id);
    const transportDisconnect = jest.fn();
    emitter.on('transport-device-disconnect', transportDisconnect);
    const bleTransport = configureTransport(nobleBle, emitter);

    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    disconnectHandler?.({ ...device, reason: EBleDisconnectReason.IdleKeepAlive });

    expect(transportDisconnect).toHaveBeenCalledWith({
      id: device.id,
      connectId: device.id,
      name: device.name,
    });
    // The link really is gone, so cached link state must be dropped too.
    expect(bleTransport.getProtocolType(device.id)).toBeUndefined();
  });

  test('treats a disconnect with no reason as a real device drop', async () => {
    // An older host bridge does not send `reason`; defaulting to "device left"
    // preserves the pre-existing behaviour rather than silently ignoring it.
    const device = { id: 'legacy-host-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const emitter = new EventEmitter();
    let disconnectHandler: ((d: { id: string; name: string }) => void) | undefined;
    nobleBle.onDeviceDisconnected.mockImplementation(handler => {
      disconnectHandler = handler;
      return jest.fn();
    });
    echoProtocolV2(nobleBle, device.id);
    const transportDisconnect = jest.fn();
    emitter.on('transport-device-disconnect', transportDisconnect);
    const bleTransport = configureTransport(nobleBle, emitter);

    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    disconnectHandler?.(device);

    expect(transportDisconnect).toHaveBeenCalledWith({
      id: device.id,
      connectId: device.id,
      name: device.name,
    });
  });

  test('preserves the active Protocol V2 link when the same schema is configured again', async () => {
    const device = { id: 'stable-schema-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    let responseSeq = 0;
    nobleBle.write.mockImplementation(() => {
      responseSeq += 1;
      const response = ProtocolV2.encodeFrame(
        schemas,
        'Success',
        { message: 'ok' },
        { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: responseSeq }
      );
      setTimeout(() => notificationHandler?.(device.id, bytesToHex(response)), 0);
      return Promise.resolve();
    });
    const bleTransport = configureTransport(nobleBle);

    try {
      await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
      const invalidateAllLinks = jest.spyOn(
        (bleTransport as any).protocolV2Links,
        'invalidateAllLinks'
      );
      bleTransport.configureProtocolV2(protocolV2Schema);
      await new Promise<void>(resolve => {
        setTimeout(resolve, 0);
      });
      expect(invalidateAllLinks).not.toHaveBeenCalled();
      await expect(
        bleTransport.call(device.id, 'Ping', { message: 'same-schema' })
      ).resolves.toEqual({
        type: 'Success',
        message: { message: 'ok' },
      });
      const sentSeqs = nobleBle.write.mock.calls.map(([, hex]) =>
        Number.parseInt(hex.slice(12, 14), 16)
      );
      expect(sentSeqs).toEqual([1, 2]);
    } finally {
      await bleTransport.release(device.id);
    }
  });

  test('rejects oversized Protocol V2 requests before writing to Electron BLE', async () => {
    const device = { id: 'oversized-frame-pro2-id', name: 'OneKey Pro 2' };
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
    const bleTransport = configureTransport(nobleBle);

    try {
      await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
      expect(nobleBle.write).toHaveBeenCalledTimes(1);

      await expect(
        bleTransport.call(device.id, 'Ping', { message: 'x'.repeat(2048) })
      ).rejects.toThrow(/Protocol V2 frame too large for transport/);
      expect(nobleBle.write).toHaveBeenCalledTimes(1);
    } finally {
      await bleTransport.release(device.id);
    }
  });
});
