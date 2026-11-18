import transport, { PROTOCOL_V2_CHANNEL_BLE_UART, bytesToHex } from '@onekeyfe/hd-transport';
import {
  EBleDisconnectReason,
  EOneKeyBleMessageKeys,
  ERRORS,
  HardwareErrorCode,
  createDeferred,
} from '@onekeyfe/hd-shared';
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

  test.each([
    { errorCode: HardwareErrorCode.BleLocationError, message: 'Permission denied' },
    { code: HardwareErrorCode.BleLocationError },
    { message: 'Bluetooth unauthorized' },
  ])('preserves Bluetooth permission failures from the native bridge: %j', async error => {
    const nobleBle = createNobleBle();
    nobleBle.enumerate.mockRejectedValueOnce(error);
    const bleTransport = configureTransport(nobleBle);

    await expect(bleTransport.enumerate()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleLocationError,
    });
  });

  test('passes the advertised color from the native bridge into the descriptor', async () => {
    const nobleBle = createNobleBle();
    nobleBle.enumerate.mockResolvedValueOnce([
      { id: 'colored-pro2-id', name: 'Pro 2 A1B2', bleColorCode: 'B' },
      { id: 'legacy-pro2-id', name: 'Pro 2 C3D4' },
    ] as never);
    const bleTransport = configureTransport(nobleBle);

    await expect(bleTransport.enumerate()).resolves.toEqual([
      {
        id: 'colored-pro2-id',
        name: 'Pro 2 A1B2',
        path: 'colored-pro2-id',
        debug: false,
        commType: 'electron-ble',
        bleColorCode: 'B',
      },
      {
        id: 'legacy-pro2-id',
        name: 'Pro 2 C3D4',
        path: 'legacy-pro2-id',
        debug: false,
        commType: 'electron-ble',
      },
    ]);
  });

  test('does not treat an error envelope from a legacy preload as a successful connect', async () => {
    const device = { id: 'legacy-error-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    nobleBle.connect.mockResolvedValue({
      type: 'NobleBleIpcError',
      success: false,
      error: {
        name: 'HardwareError',
        message: 'Bluetooth connection failed',
        errorCode: HardwareErrorCode.BleConnectedError,
      },
    } as never);
    const bleTransport = configureTransport(nobleBle);

    await expect(
      bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleConnectedError,
    });
    expect(nobleBle.subscribe).not.toHaveBeenCalled();
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
  });

  test('cancels a pending native connect acquire has not registered yet', async () => {
    const device = { id: 'pending-connect-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    // Never calls back: the field case the Core acquire deadline has to break.
    nobleBle.connect.mockImplementation(
      () =>
        new Promise<void>(() => {
          // intentionally never settles
        })
    );
    const bleTransport = configureTransport(nobleBle) as any;

    const pendingAcquire = bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    pendingAcquire.catch(() => undefined);
    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });

    // What the deadline / user abort calls. connectedDevices is still empty
    // here, so this only works because the acquire is tracked as in flight.
    await bleTransport.disconnect(device.id);

    expect(nobleBle.unsubscribe).not.toHaveBeenCalled();
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
  });

  test('leaves a kept-alive link up when a released device is disconnected', async () => {
    const device = { id: 'kept-alive-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const bleTransport = configureTransport(nobleBle) as any;

    // No acquire in flight and nothing in connectedDevices: the link was
    // released logically and belongs to the main-process keep-alive timer.
    // The routine post-call cancel must not cost the next call a cold connect.
    await bleTransport.disconnect(device.id);

    expect(nobleBle.disconnect).not.toHaveBeenCalled();
    expect(nobleBle.unsubscribe).not.toHaveBeenCalled();
  });

  test.each([false, true])(
    'forwards the existing keepSession=%s release intent to native',
    async keepSession => {
      const device = { id: 'release-intent-pro2-id', name: 'OneKey Pro 2' };
      const release = jest.fn().mockResolvedValue(undefined);
      const nobleBle = { ...createNobleBle(device), release };
      echoProtocolV2(nobleBle, device.id);
      const bleTransport = configureTransport(nobleBle);
      await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });

      await bleTransport.release(device.id, false, keepSession);

      expect(release).toHaveBeenCalledWith(device.id, keepSession);
      expect(nobleBle.disconnect).not.toHaveBeenCalled();
      expect(nobleBle.unsubscribe).not.toHaveBeenCalled();
    }
  );

  test.each(['Pro 2', 'Neo'])(
    'reuses the connection, subscription and V2 sequence for %s after release',
    async name => {
      const device = { id: 'retained-v2-id', name };
      const release = jest.fn().mockResolvedValue(undefined);
      const nobleBle = { ...createNobleBle(device), release };
      echoProtocolV2(nobleBle, device.id);
      const bleTransport = configureTransport(nobleBle);
      await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
      await bleTransport.call(device.id, 'Ping', { message: 'before-release' });
      const notifyCleanup = nobleBle.onNotification.mock.results[0].value;

      try {
        await bleTransport.release(device.id, false, true);
        expect(bleTransport.getProtocolType(device.id)).toBe('V2');
        expect(notifyCleanup).not.toHaveBeenCalled();
        await expect(
          bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
        ).resolves.toMatchObject({ uuid: device.id, protocolType: 'V2' });
        await expect(
          bleTransport.call(device.id, 'Ping', { message: 'after-release' })
        ).resolves.toMatchObject({ type: 'Success' });

        expect(nobleBle.connect).toHaveBeenCalledTimes(1);
        expect(nobleBle.subscribe).toHaveBeenCalledTimes(1);
        expect(nobleBle.onNotification).toHaveBeenCalledTimes(1);
        expect(nobleBle.onMtuChanged).toHaveBeenCalledTimes(1);
        expect(release).toHaveBeenCalledWith(device.id, true);
        expect(
          nobleBle.write.mock.calls.map(([, hex]) => Number.parseInt(hex.slice(12, 14), 16))
        ).toEqual([1, 2, 3]);
      } finally {
        await bleTransport.disconnect(device.id);
      }
      expect(notifyCleanup).toHaveBeenCalledTimes(1);
      expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
    }
  );

  test.each(['ordinary release', 'onclose', 'forced probe'])(
    'does not retain renderer state for %s',
    async mode => {
      const device = { id: 'release-fallback-id', name: 'Pro 2' };
      const nobleBle = createNobleBle(device);
      echoProtocolV2(nobleBle, device.id);
      const bleTransport = configureTransport(nobleBle);
      await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
      const notifyCleanup = nobleBle.onNotification.mock.results[0].value;
      await bleTransport.release(device.id, mode === 'onclose', mode !== 'ordinary release');

      const input = {
        uuid: device.id,
        expectedProtocol: 'V2' as const,
        forceProtocolDetection: mode === 'forced probe',
      };
      await bleTransport.acquire(input);

      expect(notifyCleanup).toHaveBeenCalledTimes(1);
      expect(nobleBle.connect).toHaveBeenCalledTimes(2);
      expect(nobleBle.subscribe).toHaveBeenCalledTimes(2);
      await bleTransport.disconnect(device.id);
    }
  );

  test.each([false, true])(
    'rebuilds a retained link after a disconnect, including during lookup: %s',
    async duringLookup => {
      const device = { id: 'retained-drop-id', name: 'Pro 2' };
      const nobleBle = createNobleBle(device);
      echoProtocolV2(nobleBle, device.id);
      const bleTransport = configureTransport(nobleBle);
      await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
      await bleTransport.release(device.id, false, true);
      const disconnectHandler = nobleBle.onDeviceDisconnected.mock.calls[0][0];
      const notifyCleanup = nobleBle.onNotification.mock.results[0].value;
      const drop = () =>
        disconnectHandler({ ...device, reason: EBleDisconnectReason.DeviceDisconnected });
      if (duringLookup) {
        nobleBle.getDevice.mockImplementationOnce(() => {
          drop();
          return Promise.resolve(device);
        });
      } else {
        drop();
      }

      await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
      await expect(bleTransport.call(device.id, 'Ping', {})).resolves.toMatchObject({
        type: 'Success',
      });

      expect(notifyCleanup).toHaveBeenCalledTimes(1);
      expect(nobleBle.connect).toHaveBeenCalledTimes(2);
      expect(nobleBle.subscribe).toHaveBeenCalledTimes(2);
      await bleTransport.disconnect(device.id);
    }
  );

  test('disconnects a reused link on timeout without replaying the call', async () => {
    const device = { id: 'retained-timeout-id', name: 'Pro 2' };
    const nobleBle = createNobleBle(device);
    echoProtocolV2(nobleBle, device.id);
    const bleTransport = configureTransport(nobleBle);
    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    await bleTransport.release(device.id, false, true);
    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    nobleBle.write.mockImplementationOnce(() => Promise.resolve());

    await expect(bleTransport.call(device.id, 'Ping', {}, { timeoutMs: 10 })).rejects.toMatchObject(
      {
        errorCode: HardwareErrorCode.BleTimeoutError,
      }
    );

    expect(nobleBle.write).toHaveBeenCalledTimes(2);
    expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
    expect(bleTransport.getProtocolType(device.id)).toBeUndefined();
    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    expect(nobleBle.subscribe).toHaveBeenCalledTimes(2);
    await bleTransport.disconnect(device.id);
  });

  test('invalidates a retained link when native release fails', async () => {
    const device = { id: 'retained-release-failure-id', name: 'Pro 2' };
    const release = jest.fn().mockRejectedValueOnce(new Error('IPC release failed'));
    const nobleBle = { ...createNobleBle(device), release };
    echoProtocolV2(nobleBle, device.id);
    const bleTransport = configureTransport(nobleBle);
    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    const notifyCleanup = nobleBle.onNotification.mock.results[0].value;

    await bleTransport.release(device.id, false, true);

    expect(bleTransport.getProtocolType(device.id)).toBeUndefined();
    expect(notifyCleanup).toHaveBeenCalledTimes(1);
    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    expect(nobleBle.subscribe).toHaveBeenCalledTimes(2);
    await bleTransport.disconnect(device.id);
  });

  test('still cancels an in-flight V2 write when release requests retention', async () => {
    const device = { id: 'active-release-id', name: 'Pro 2' };
    const nobleBle = createNobleBle(device);
    echoProtocolV2(nobleBle, device.id);
    const bleTransport = configureTransport(nobleBle);
    await bleTransport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
    const started = createDeferred<void>();
    const write = createDeferred<void>();
    nobleBle.write.mockImplementationOnce(() => {
      started.resolve();
      return write.promise;
    });
    const result = bleTransport.call(device.id, 'Ping', {}).catch(error => error);
    await started.promise;

    try {
      const releasing = bleTransport.release(device.id, false, true);
      write.resolve();
      await releasing;
      await expect(result).resolves.toMatchObject({ message: 'Electron BLE transport released' });
      expect(bleTransport.getProtocolType(device.id)).toBeUndefined();
    } finally {
      write.resolve();
      await bleTransport.disconnect(device.id);
    }
  });

  test('forceNative disconnects a device the renderer no longer tracks', async () => {
    const device = { id: 'presumed-dead-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const bleTransport = configureTransport(nobleBle) as any;

    await bleTransport.releaseNative(device.id, { forceNative: true });

    expect(nobleBle.unsubscribe).not.toHaveBeenCalled();
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
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
      const notifyCleanup = nobleBle.onNotification.mock.results[0].value;
      await transport.release(device.id, false, true);
      expect(transport.getProtocolType(device.id)).toBeUndefined();
      expect(notifyCleanup).toHaveBeenCalledTimes(1);
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

  test('disconnects when both protocol probes fail and reconnects for the next acquire', async () => {
    const device = { id: 'dead-device-id', name: 'Unknown Device' };
    const nobleBle = createNobleBle(device);

    // Never respond to writes — both probes will timeout
    nobleBle.onNotification.mockImplementation(() => jest.fn());

    const transport = configureTransport(nobleBle);

    await expect(transport.acquire({ uuid: device.id })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.TransportProtocolProbeFailed,
    });
    expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
    expect(transport.getProtocolType(device.id)).toBeUndefined();

    echoProtocolV2(nobleBle, device.id);
    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).resolves.toMatchObject({ uuid: device.id });
    expect(nobleBle.connect).toHaveBeenCalledTimes(2);
    expect(nobleBle.disconnect.mock.invocationCallOrder.at(-1)).toBeLessThan(
      nobleBle.connect.mock.invocationCallOrder[1]
    );
    await expect(
      transport.call(device.id, 'Ping', { message: 'after-reconnect' })
    ).resolves.toMatchObject({
      type: 'Success',
      message: { message: 'ok' },
    });
    await transport.release(device.id);
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

  test('detects a V2-only device on first acquire without a protocol hint', async () => {
    const device = { id: 'v2-only-no-hint-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
    let responseSeq = 0;
    nobleBle.onNotification.mockImplementation(handler => {
      notificationHandler = handler;
      return jest.fn();
    });
    nobleBle.write.mockImplementation(() => {
      const writeCount = nobleBle.write.mock.calls.length;
      if (writeCount === 1) {
        return Promise.resolve();
      }
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

    await expect(transport.acquire({ uuid: device.id })).resolves.toMatchObject({
      uuid: device.id,
      protocolType: 'V2',
    });
    expect(nobleBle.write).toHaveBeenCalledTimes(2);
    expect(nobleBle.connect).toHaveBeenCalledTimes(1);
    expect(nobleBle.subscribe).toHaveBeenCalledTimes(1);
    expect(nobleBle.disconnect).not.toHaveBeenCalled();
  });

  test('keeps a first expected Protocol V2 probe miss retryable', async () => {
    const device = { id: 'first-v2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    const transport = configureTransport(nobleBle);
    jest.spyOn(transport as any, 'probeProtocolV2').mockResolvedValue(false);

    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.TransportProtocolProbeFailed,
      params: { expectedProtocol: 'V2' },
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
      errorCode: HardwareErrorCode.TransportProtocolProbeFailed,
      params: { expectedProtocol: 'V2' },
    });
    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.TransportProtocolProbeFailed,
      params: { expectedProtocol: 'V2' },
    });

    expect(transport.getProtocolType(device.id)).toBeUndefined();
  });

  test('fails Protocol V2 acquire immediately when subscribe reports a connection error', async () => {
    const device = { id: 'subscribe-error-pro2-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    nobleBle.subscribe.mockRejectedValue({
      name: 'HardwareError',
      message: 'Bluetooth connection failed',
      errorCode: HardwareErrorCode.BleConnectedError,
    });
    const transport = configureTransport(nobleBle);
    const probe = jest.spyOn(transport as any, 'probeProtocolV2');

    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleConnectedError,
    });

    expect(probe).not.toHaveBeenCalled();
    expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
  });

  test('rehydrates a structured connection error before the protocol is known', async () => {
    const device = { id: 'reset-unknown-protocol-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    nobleBle.connect.mockRejectedValue({
      name: 'HardwareError',
      message: 'Bluetooth connection failed',
      errorCode: HardwareErrorCode.BleConnectedError,
    });
    const transport = configureTransport(nobleBle);

    await expect(transport.acquire({ uuid: device.id })).rejects.toMatchObject({
      name: 'HardwareError',
      errorCode: HardwareErrorCode.BleConnectedError,
    });
  });

  test('does not infer hardware errors from native error text in the renderer', async () => {
    const device = { id: 'reset-pro2-localized-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    nobleBle.connect.mockRejectedValue(new Error('CBATTErrorDomain:14 localized native message'));
    const transport = configureTransport(nobleBle);

    try {
      await transport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
      throw new Error('Expected acquire to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('CBATTErrorDomain:14 localized native message');
      expect((error as { errorCode?: unknown }).errorCode).toBeUndefined();
    }
  });

  test('preserves a generic macOS connection failure', async () => {
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

  test('preserves a native subscribe failure during Protocol V1 acquire', async () => {
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

  test('keeps a probe miss retryable after a previously confirmed Protocol V2 connection', async () => {
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
      errorCode: HardwareErrorCode.TransportProtocolProbeFailed,
      params: { expectedProtocol: 'V2' },
    });

    expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
    expect(transport.getProtocolType(device.id)).toBeUndefined();
  });

  test.each([false, true])(
    'preserves an expected Protocol V2 Ping timeout with a prior successful connection: %s',
    async previouslyConnected => {
      const device = { id: 'timeout-pro2-id', name: 'OneKey Pro 2' };
      const nobleBle = createNobleBle(device);
      const transport = configureTransport(nobleBle);

      if (previouslyConnected) {
        echoProtocolV2(nobleBle, device.id);
        await transport.acquire({ uuid: device.id, expectedProtocol: 'V2' });
        await transport.release(device.id);
      }
      // Keep the real probe and response timer, but drop its notification.
      nobleBle.write.mockImplementation(() => Promise.resolve());

      await expect(
        transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
      ).rejects.toMatchObject({
        errorCode: HardwareErrorCode.BleTimeoutError,
        message: 'BLE response timeout after 5000ms for Ping',
      });

      expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
      expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
      expect(transport.getProtocolType(device.id)).toBeUndefined();
    }
  );

  test('preserves a native connection error during an expected Protocol V2 probe', async () => {
    const device = { id: 'connection-error-probe-id', name: 'OneKey Pro 2' };
    const nobleBle = createNobleBle(device);
    nobleBle.write.mockRejectedValue({
      name: 'HardwareError',
      message: 'Bluetooth connection failed',
      errorCode: HardwareErrorCode.BleConnectedError,
    });
    const transport = configureTransport(nobleBle);

    await expect(
      transport.acquire({ uuid: device.id, expectedProtocol: 'V2' })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.BleConnectedError });

    expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
  });

  test.each([
    HardwareErrorCode.BleDeviceBondError,
    HardwareErrorCode.BleDeviceBondedCanceled,
    HardwareErrorCode.BlePeerRemovedPairingInformation,
    HardwareErrorCode.BleBondInvalid,
  ])('preserves pairing-recovery error %s during undeclared Protocol V1 probe', async errorCode => {
    const device = { id: `undeclared-v1-${errorCode}`, name: 'Unknown BLE Device' };
    const nobleBle = createNobleBle(device);
    nobleBle.write.mockRejectedValueOnce({
      name: 'HardwareError',
      message: `Pairing failure ${errorCode}`,
      errorCode,
    });
    const bleTransport = configureTransport(nobleBle);
    const probeProtocolV2 = jest.spyOn(bleTransport as any, 'probeProtocolV2');

    await expect(bleTransport.acquire({ uuid: device.id })).rejects.toMatchObject({ errorCode });

    expect(probeProtocolV2).not.toHaveBeenCalled();
    expect(nobleBle.write).toHaveBeenCalledTimes(1);
    expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
    expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
    expect(bleTransport.getProtocolType(device.id)).toBeUndefined();
  });

  test.each([
    [
      'pairing_no_response',
      HardwareErrorCode.BleDeviceBondError,
      { phase: 'pairing', platform: 'win32', stage: 'write', reason: 'pairing_no_response' },
    ],
    [
      'silence stale_bond',
      HardwareErrorCode.BleBondInvalid,
      { phase: 'pairing', platform: 'win32', stage: 'write', reason: 'stale_bond' },
    ],
  ] as const)(
    'falls through to Protocol V2 when undeclared V1 probe hits silent Windows %s',
    async (_label, errorCode, params) => {
      const device = { id: `win-silent-${errorCode}`, name: 'Unknown BLE Device' };
      const nobleBle = createNobleBle(device);
      let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
      nobleBle.onNotification.mockImplementation(handler => {
        notificationHandler = handler;
        return jest.fn();
      });
      const probeResponse = ProtocolV2.encodeFrame(
        schemas,
        'Success',
        { message: 'ok' },
        { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: 1 }
      );
      nobleBle.write
        .mockRejectedValueOnce({
          name: 'HardwareError',
          message: 'Silent pairing miss',
          errorCode,
          params,
        })
        .mockImplementationOnce(() => {
          setTimeout(() => notificationHandler?.(device.id, bytesToHex(probeResponse)), 0);
          return Promise.resolve();
        });
      const bleTransport = configureTransport(nobleBle);

      try {
        await expect(bleTransport.acquire({ uuid: device.id })).resolves.toMatchObject({
          uuid: device.id,
          protocolType: 'V2',
        });
        expect(nobleBle.write).toHaveBeenCalledTimes(2);
        expect(nobleBle.disconnect).not.toHaveBeenCalled();
      } finally {
        await bleTransport.release(device.id);
      }
    }
  );

  test.each([
    [
      'pairing_no_response',
      HardwareErrorCode.BleDeviceBondError,
      { phase: 'pairing', platform: 'win32', stage: 'write', reason: 'pairing_no_response' },
    ],
    [
      'silence stale_bond',
      HardwareErrorCode.BleBondInvalid,
      { phase: 'pairing', platform: 'win32', stage: 'write', reason: 'stale_bond' },
    ],
  ] as const)(
    'preserves silent Windows %s when both undeclared probes fail',
    async (_label, errorCode, params) => {
      const device = { id: `win-silent-both-${errorCode}`, name: 'Unknown BLE Device' };
      const nobleBle = createNobleBle(device);
      const silentError = {
        name: 'HardwareError',
        message: 'Silent pairing miss',
        errorCode,
        params,
      };
      nobleBle.write.mockRejectedValue(silentError);
      const bleTransport = configureTransport(nobleBle);

      await expect(bleTransport.acquire({ uuid: device.id })).rejects.toMatchObject({
        errorCode,
        params,
      });

      expect(nobleBle.write).toHaveBeenCalledTimes(2);
      expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
      expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
      expect(bleTransport.getProtocolType(device.id)).toBeUndefined();
    }
  );

  test.each([
    [
      HardwareErrorCode.BleDeviceBondError,
      {
        phase: 'pairing',
        platform: 'win32',
        stage: 'write',
        reason: 'pairing_failed',
        nativeErrorMessage: 'Access denied',
      },
    ],
    [
      HardwareErrorCode.BleBondInvalid,
      {
        phase: 'pairing',
        platform: 'win32',
        stage: 'write',
        reason: 'stale_bond',
        nativeErrorMessage: 'status: 3',
      },
    ],
    [
      HardwareErrorCode.BleBondInvalid,
      {
        phase: 'pairing',
        platform: 'win32',
        stage: 'subscribe',
        reason: 'stale_bond',
      },
    ],
  ] as const)(
    'keeps confirmed Windows pairing failure %s terminal during undeclared V1 probe',
    async (errorCode, params) => {
      const device = {
        id: `win-confirmed-${errorCode}-${params.stage}`,
        name: 'Unknown BLE Device',
      };
      const nobleBle = createNobleBle(device);
      nobleBle.write.mockRejectedValueOnce({
        name: 'HardwareError',
        message: 'Confirmed pairing failure',
        errorCode,
        params,
      });
      const bleTransport = configureTransport(nobleBle);
      const probeProtocolV2 = jest.spyOn(bleTransport as any, 'probeProtocolV2');

      await expect(bleTransport.acquire({ uuid: device.id })).rejects.toMatchObject({
        errorCode,
        params,
      });

      expect(probeProtocolV2).not.toHaveBeenCalled();
      expect(nobleBle.write).toHaveBeenCalledTimes(1);
      expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
      expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
    }
  );

  test.each([
    HardwareErrorCode.BleDeviceBondError,
    HardwareErrorCode.BleDeviceBondedCanceled,
    HardwareErrorCode.BlePeerRemovedPairingInformation,
    HardwareErrorCode.BleBondInvalid,
  ])(
    'preserves pairing-recovery error %s during undeclared Protocol V2 probe after V1 miss',
    async errorCode => {
      const device = { id: `undeclared-v2-${errorCode}`, name: 'OneKey Pro 2' };
      const nobleBle = createNobleBle(device);
      let notificationHandler: ((deviceId: string, data: string) => void) | undefined;
      nobleBle.onNotification.mockImplementation(handler => {
        notificationHandler = handler;
        return jest.fn();
      });
      if (errorCode === HardwareErrorCode.BleDeviceBondedCanceled) {
        nobleBle.write.mockImplementationOnce(() => {
          setTimeout(() => notificationHandler?.(device.id, 'PAIRING_REJECTED'), 0);
          return Promise.resolve();
        });
      } else {
        nobleBle.write.mockRejectedValueOnce({
          name: 'HardwareError',
          message: `Pairing failure ${errorCode}`,
          errorCode,
        });
      }
      const bleTransport = configureTransport(nobleBle);
      jest
        .spyOn(bleTransport as any, 'callProtocolV1')
        .mockRejectedValueOnce(ERRORS.TypedError(HardwareErrorCode.BleTimeoutError));

      await expect(bleTransport.acquire({ uuid: device.id })).rejects.toMatchObject({ errorCode });

      expect(nobleBle.write).toHaveBeenCalledTimes(1);
      expect(nobleBle.unsubscribe).toHaveBeenCalledWith(device.id);
      expect(nobleBle.disconnect).toHaveBeenCalledWith(device.id);
      expect(bleTransport.getProtocolType(device.id)).toBeUndefined();
    }
  );

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

describe('ElectronBleTransport Windows write-loop protocol detection integration', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    delete (global as any).window;
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  const setupWindowsIntegration = async (options?: { writeErrorOnV1?: Error }) => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });

    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const notificationListeners = new Set<(deviceId: string, data: string) => void>();
    const disconnectListeners = new Set<
      (device: { id: string; name: string; reason?: EBleDisconnectReason }) => void
    >();
    const mtuListeners = new Set<(device: { id: string; mtu: number }) => void>();

    const webContents = {
      isDestroyed: jest.fn(() => false),
      on: jest.fn(),
      send: jest.fn((channel: string, ...args: unknown[]) => {
        if (channel === EOneKeyBleMessageKeys.NOBLE_BLE_NOTIFICATION) {
          const [deviceId, data] = args as [string, string];
          notificationListeners.forEach(listener => listener(deviceId, data));
        } else if (channel === EOneKeyBleMessageKeys.BLE_DEVICE_DISCONNECTED) {
          const [payload] = args as [{ id: string; name: string; reason?: EBleDisconnectReason }];
          disconnectListeners.forEach(listener => listener(payload));
        } else if (channel === EOneKeyBleMessageKeys.NOBLE_BLE_MTU_CHANGED) {
          const [payload] = args as [{ id: string; mtu: number }];
          mtuListeners.forEach(listener => listener(payload));
        }
      }),
    };

    const ipcMain = {
      handle: jest.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
      }),
    };

    const deviceId = 'win-v2-only-device';
    let responseSeq = 0;

    const notifyCharacteristic = Object.assign(new EventEmitter(), {
      uuid: '0003',
      unsubscribe: jest.fn((callback: (error?: Error) => void) => callback()),
      subscribe: jest.fn((callback: (error?: Error) => void) => callback()),
    });

    const writeCharacteristic = Object.assign(new EventEmitter(), {
      uuid: '0002',
      write: jest.fn(
        (buffer: Buffer, _withoutResponse: boolean, callback: (error?: Error) => void) => {
          if (buffer[0] === 0x5a) {
            // Emit synchronously so attemptWindowsWriteUntilPaired observes
            // pairedDevices before it starts another silent retry.
            notifyCharacteristic.emit('data', Buffer.alloc(0));
            callback();
            return;
          }
          if (options?.writeErrorOnV1) {
            callback(options.writeErrorOnV1);
            return;
          }
          // Healthy V2-only device ignores V1 GetFeatures silently without native errors.
          callback();
        }
      ),
    });

    const service = {
      uuid: '0001',
      discoverCharacteristics: jest.fn(
        (
          _characteristicUuids: string[],
          callback: (error: Error | null, value: unknown[]) => void
        ) => callback(null, [writeCharacteristic, notifyCharacteristic])
      ),
    };

    const peripheral = Object.assign(new EventEmitter(), {
      id: deviceId,
      state: 'disconnected',
      advertisement: {
        localName: 'Unknown BLE Device',
        serviceUuids: ['0001', 'fffd'],
      },
      connect: jest.fn((callback: (error?: Error) => void) => {
        peripheral.state = 'connected';
        callback();
      }),
      disconnect: jest.fn((callback: () => void) => {
        peripheral.state = 'disconnected';
        callback();
      }),
      discoverServices: jest.fn(
        (_serviceUuids: string[], callback: (error: Error | null, value: unknown[]) => void) =>
          callback(null, [service])
      ),
    });

    const noble = Object.assign(new EventEmitter(), {
      state: 'poweredOn',
      startScanning: jest.fn((_services, _duplicates, callback) => {
        callback?.();
        noble.emit('discover', peripheral);
      }),
      stopScanning: jest.fn(callback => callback?.()),
      stop: jest.fn(),
    });

    jest.resetModules();
    jest.doMock('@stoprocent/noble', () => noble);
    jest.doMock(
      'electron',
      () => ({
        ipcMain,
        webContents: { getAllWebContents: () => [webContents] },
      }),
      { virtual: true }
    );
    jest.doMock('electron-log', () => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    const sdk = await import('@onekeyfe/hd-transport-electron/src/noble-ble-handler');
    const TransportCtor = (await import('../src/electron-ble-transport')).default;
    sdk.setupNobleBleHandlers(webContents as any);

    const invoke = (channel: string, ...args: unknown[]) => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`Missing IPC handler for ${channel}`);
      }
      return Promise.resolve(handler(undefined, ...args));
    };

    const nobleBle = {
      enumerate: () => invoke(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE),
      getDevice: (id: string) => invoke(EOneKeyBleMessageKeys.NOBLE_BLE_GET_DEVICE, id),
      connect: (id: string) => invoke(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT, id),
      disconnect: (id: string) => invoke(EOneKeyBleMessageKeys.NOBLE_BLE_DISCONNECT, id),
      subscribe: (id: string) => invoke(EOneKeyBleMessageKeys.NOBLE_BLE_SUBSCRIBE, id),
      unsubscribe: (id: string) => invoke(EOneKeyBleMessageKeys.NOBLE_BLE_UNSUBSCRIBE, id),
      write: async (id: string, hex: string, writeOptions?: unknown) => {
        const result = await invoke(EOneKeyBleMessageKeys.NOBLE_BLE_WRITE, id, hex, writeOptions);
        // The native Windows write loop may emit a notification before the
        // renderer has started readFrame. Deliver the V2 Success after the
        // write IPC settles, matching the renderer-level V2-only tests.
        if (hex.startsWith('5a')) {
          responseSeq += 1;
          const response = ProtocolV2.encodeFrame(
            schemas,
            'Success',
            { message: 'ok' },
            { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: responseSeq }
          );
          setTimeout(() => {
            notificationListeners.forEach(listener => listener(id, bytesToHex(response)));
          }, 0);
        }
        return result;
      },
      release: (id: string, keepSession?: boolean) =>
        invoke(EOneKeyBleMessageKeys.NOBLE_BLE_RELEASE, id, keepSession),
      onNotification: (listener: (id: string, data: string) => void) => {
        notificationListeners.add(listener);
        return () => notificationListeners.delete(listener);
      },
      onDeviceDisconnected: (
        listener: (device: { id: string; name: string; reason?: EBleDisconnectReason }) => void
      ) => {
        disconnectListeners.add(listener);
        return () => disconnectListeners.delete(listener);
      },
      onMtuChanged: (listener: (device: { id: string; mtu: number }) => void) => {
        mtuListeners.add(listener);
        return () => mtuListeners.delete(listener);
      },
      checkAvailability: () => invoke(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK),
    };

    (global as any).window = {
      desktopApi: {
        nobleBle,
      },
    };

    const logger = createLogger();
    const bleTransport = new TransportCtor();
    bleTransport.init(logger);
    bleTransport.configure(protocolV1Schema);
    bleTransport.configureProtocolV2(protocolV2Schema);

    const driveTimersUntilSettled = async <T>(promise: Promise<T>): Promise<T> => {
      let settled = false;
      promise.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        }
      );
      for (let step = 0; step < 60 && !settled; step += 1) {
        for (let flush = 0; flush < 5 && !settled; flush += 1) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>(resolve => {
            setImmediate(resolve);
          });
        }
        if (settled) break;
        jest.advanceTimersByTime(2000);
      }
      return promise;
    };

    return {
      sdk,
      logger,
      webContents,
      bleTransport,
      nobleBle,
      peripheral,
      writeCharacteristic,
      driveTimersUntilSettled,
    };
  };

  test('detects a V2-only device on Windows through real attemptWindowsWriteUntilPaired V1 silence (first acquire and wasBonded reconnect)', async () => {
    const {
      sdk,
      bleTransport,
      nobleBle,
      peripheral,
      writeCharacteristic,
      driveTimersUntilSettled,
    } = await setupWindowsIntegration();

    try {
      await driveTimersUntilSettled(nobleBle.enumerate());

      // First acquire, no protocol hint: V1 write loop hits 15 silent attempts (715
      // pairing_no_response), keeps GATT link, and falls through to V2 Ping.
      await expect(
        driveTimersUntilSettled(bleTransport.acquire({ uuid: peripheral.id }))
      ).resolves.toMatchObject({
        uuid: peripheral.id,
        protocolType: 'V2',
      });

      const firstAcquireFirstBytes = writeCharacteristic.write.mock.calls.map(([buf]) => buf[0]);
      expect(firstAcquireFirstBytes.slice(0, 15).every(b => b === 0x3f)).toBe(true);
      expect(firstAcquireFirstBytes[15]).toBe(0x5a);
      expect(firstAcquireFirstBytes).toHaveLength(16);
      // Cold setup force-reconnects once. V1 silence must not abort the GATT link
      // before the V2 probe runs.
      expect(peripheral.disconnect).toHaveBeenCalledTimes(1);

      // Disconnect so pairedDevices clears while bondedDevices retains peripheral.id.
      await bleTransport.disconnect(peripheral.id);
      writeCharacteristic.write.mockClear();
      peripheral.disconnect.mockClear();

      // Clear renderer hint so the next acquire probes V1 first again with wasBonded=true.
      (bleTransport as any).deviceProtocolHints.delete(peripheral.id);

      // wasBonded + silence on V1 produces BleBondInvalid (724) with reason: 'stale_bond'
      // and no nativeErrorMessage; healthy V2 device still falls through to V2.
      await expect(
        driveTimersUntilSettled(bleTransport.acquire({ uuid: peripheral.id }))
      ).resolves.toMatchObject({
        uuid: peripheral.id,
        protocolType: 'V2',
      });

      const secondAcquireFirstBytes = writeCharacteristic.write.mock.calls.map(([buf]) => buf[0]);
      expect(secondAcquireFirstBytes.slice(0, 15).every(b => b === 0x3f)).toBe(true);
      expect(secondAcquireFirstBytes[15]).toBe(0x5a);
      expect(secondAcquireFirstBytes).toHaveLength(16);
      // After mockClear, only the next cold-setup force-reconnect should run.
      expect(peripheral.disconnect).toHaveBeenCalledTimes(1);

      await bleTransport.disconnect(peripheral.id);
    } finally {
      await sdk.disposeNobleBleSupport();
    }
  });

  test('keeps confirmed Windows native status: 3 terminal during undeclared V1 probe', async () => {
    const {
      sdk,
      bleTransport,
      nobleBle,
      peripheral,
      writeCharacteristic,
      driveTimersUntilSettled,
    } = await setupWindowsIntegration({
      writeErrorOnV1: new Error('GATT operation failed, status: 3'),
    });

    try {
      await driveTimersUntilSettled(nobleBle.enumerate());

      await expect(
        driveTimersUntilSettled(bleTransport.acquire({ uuid: peripheral.id }))
      ).rejects.toMatchObject({
        errorCode: HardwareErrorCode.BleDeviceBondError,
        params: {
          phase: 'pairing',
          platform: 'win32',
          stage: 'write',
          reason: 'pairing_failed',
          nativeErrorMessage: 'GATT operation failed, status: 3',
        },
      });

      expect(writeCharacteristic.write).toHaveBeenCalledTimes(1);
      expect(peripheral.disconnect).toHaveBeenCalled();
    } finally {
      await sdk.disposeNobleBleSupport();
    }
  });
});
