import { EventEmitter } from 'events';
import transportPackage, {
  PROTOCOL_V2_CHANNEL_BLE_UART,
  ProtocolV2,
  TRANSPORT_EVENT,
  bytesToHex,
} from '@onekeyfe/hd-transport';
import { HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport, {
  configureProtocolV2BleTuning,
  getFirmwareUploadWriteRetryType,
  resetProtocolV2BleTuning,
} from '../index';

jest.mock(
  'react-native',
  () => ({
    PermissionsAndroid: {},
    Platform: { OS: 'ios' },
  }),
  { virtual: true }
);

jest.mock('react-native-ble-plx', () => ({
  BleATTErrorCode: { UnlikelyError: 14 },
  BleError: class BleError extends Error {},
  BleErrorCode: {
    DeviceAlreadyConnected: 203,
    DeviceDisconnected: 205,
    DeviceMTUChangeFailed: 206,
    OperationCancelled: 2,
    CharacteristicNotFound: 404,
  },
  BleManager: jest.fn(),
  ScanMode: { LowLatency: 2 },
}));

jest.mock('../BleManager', () => ({
  getConnectedDeviceIds: jest.fn(() => Promise.resolve([])),
  onDeviceBondState: jest.fn(() => Promise.resolve()),
  pairDevice: jest.fn(() => Promise.resolve({ bonded: true, bonding: false })),
}));

jest.mock('../subscribeBleOn', () => ({
  subscribeBleOn: jest.fn(() => Promise.resolve()),
}));

const { parseConfigure } = transportPackage;

const protocolV1Schema = {
  nested: {
    Initialize: { fields: {} },
    GetFeatures: { fields: {} },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
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
    Ping: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    FileWrite: { fields: {} },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    MessageType: {
      values: {
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
        MessageType_FileWrite: 60805,
      },
    },
  },
};

const schemas = {
  protocolV1: parseConfigure(protocolV1Schema),
  protocolV2: parseConfigure(protocolV2Schema),
};

const createHarness = () => {
  const uuid = 'rn-pro2-id';
  const sentSeqs: number[] = [];
  let responseSeq = 0;
  let shouldRespond = true;
  let notifyCallback:
    | ((
        error: (Error & { reason?: string }) | null,
        characteristic: { value: string } | null
      ) => void)
    | undefined;
  let disconnectCallback: (() => void) | undefined;
  const notifyCharacteristic = {
    uuid: '0003',
    deviceID: uuid,
    isNotifiable: true,
    monitor: jest.fn(callback => {
      notifyCallback = callback;
      return { remove: jest.fn() };
    }),
  };
  const handleWrite = (base64: string) => {
    const frame = Buffer.from(base64, 'base64');
    sentSeqs.push(frame[6]);
    if (shouldRespond) {
      responseSeq += 1;
      const response = ProtocolV2.encodeFrame(
        schemas,
        'Success',
        { message: 'ok' },
        { router: PROTOCOL_V2_CHANNEL_BLE_UART, seq: responseSeq }
      );
      notifyCallback?.(null, { value: Buffer.from(response).toString('base64') });
    }
    return Promise.resolve();
  };
  const writeCharacteristic = {
    uuid: '0002',
    deviceID: uuid,
    isWritableWithResponse: true,
    isWritableWithoutResponse: true,
    writeWithResponse: jest.fn(handleWrite),
    writeWithoutResponse: jest.fn(handleWrite),
  };
  const device = {
    id: uuid,
    name: 'OneKey Pro 2',
    localName: 'OneKey Pro 2',
    serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
    isConnected: jest.fn(() => Promise.resolve(true)),
    cancelConnection: jest.fn(() => Promise.resolve()),
    onDisconnected: jest.fn(callback => {
      disconnectCallback = callback;
      return { remove: jest.fn() };
    }),
  };
  const bleManager = {
    devices: jest.fn(() => Promise.resolve([device])),
    connectedDevices: jest.fn(() => Promise.resolve([])),
    cancelTransaction: jest.fn(() => Promise.resolve()),
  };
  const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
  const emitter = new EventEmitter();
  transport.blePlxManager = bleManager;
  transport.resolveCharacteristics = jest.fn(() =>
    Promise.resolve({ writeCharacteristic, notifyCharacteristic })
  );
  transport.init({ debug: jest.fn(), error: jest.fn() }, emitter);
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);

  return {
    transport,
    emitter,
    uuid,
    sentSeqs,
    writeCharacteristic,
    setShouldRespond(value: boolean) {
      shouldRespond = value;
    },
    emitMonitorError(error: Error & { reason?: string }) {
      notifyCallback?.(error, null);
    },
    emitDisconnect() {
      disconnectCallback?.();
    },
  };
};

const createV1Harness = () => {
  const uuid = 'rn-classic-id';
  let notifyCallback:
    | ((error: Error | null, characteristic: { value: string } | null) => void)
    | undefined;
  const notifyCharacteristic = {
    uuid: '0003',
    deviceID: uuid,
    isNotifiable: true,
    monitor: jest.fn(callback => {
      notifyCallback = callback;
      return { remove: jest.fn() };
    }),
  };
  let writeCount = 0;
  const writeCharacteristic = {
    uuid: '0002',
    deviceID: uuid,
    isWritableWithResponse: true,
    isWritableWithoutResponse: true,
    writeWithoutResponse: jest.fn(() => {
      writeCount += 1;
      if (writeCount === 1) {
        notifyCallback?.(null, {
          value: Buffer.from('3f23230002000000040a026f6b', 'hex').toString('base64'),
        });
      }
      return Promise.resolve();
    }),
  };
  const device = {
    id: uuid,
    name: 'OneKey Classic',
    localName: 'OneKey Classic',
    serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
    isConnected: jest.fn(() => Promise.resolve(true)),
    cancelConnection: jest.fn(() => Promise.resolve()),
    onDisconnected: jest.fn(() => ({ remove: jest.fn() })),
  };
  const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
  transport.blePlxManager = {
    devices: jest.fn(() => Promise.resolve([device])),
    connectedDevices: jest.fn(() => Promise.resolve([])),
    cancelTransaction: jest.fn(() => Promise.resolve()),
  } as any;
  transport.resolveCharacteristics = jest.fn(() =>
    Promise.resolve({ writeCharacteristic, notifyCharacteristic })
  );
  transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);
  return { transport, uuid, device };
};

describe('ReactNativeBleTransport Protocol V2 link lifecycle', () => {
  test('does not classify disconnects as retryable firmware writes', () => {
    expect(
      getFirmwareUploadWriteRetryType({
        errorCode: 205,
        message: 'Device disconnected after write',
      })
    ).toBeNull();
  });

  test('keeps another device reader when releasing a device with an active V1 call', async () => {
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 }) as any;
    const activeV1Call = createDeferred<string>();
    const otherDeviceReader = createDeferred<Uint8Array>();
    activeV1Call.promise.catch(() => undefined);
    otherDeviceReader.promise.catch(() => undefined);
    transport.runPromise = activeV1Call;
    transport.runPromiseDeviceId = 'device-a';
    transport.protocolV2FramePromises.set('device-b', otherDeviceReader);

    await transport.releaseNative('device-a', true);

    expect(transport.protocolV2FramePromises.get('device-b')).toBe(otherDeviceReader);
  });

  test('rejects a pending reader when its device frame state resets', async () => {
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 }) as any;
    const reader = createDeferred<Uint8Array>();
    transport.protocolV2FramePromises.set('device-a', reader);
    const result = Promise.race([
      reader.promise.then(
        () => 'resolved',
        () => 'rejected'
      ),
      new Promise(resolve => {
        setTimeout(() => resolve('pending'), 20);
      }),
    ]);

    transport.resetProtocolV2Frames('device-a');

    await expect(result).resolves.toBe('rejected');
  });

  test('keeps the legacy default BLE scan timeout', () => {
    expect(new ReactNativeBleTransport({}).scanTimeout).toBe(3000);
  });

  test('reconnects before falling back to Protocol V1 after a fatal V2 probe failure', async () => {
    const { transport, uuid } = createV1Harness();
    const probeProtocolV2 = jest
      .spyOn(transport as any, 'probeProtocolV2')
      .mockImplementationOnce(async () => {
        await (transport as any).releaseNative(uuid, true);
        return false;
      });
    const resolveCharacteristics = jest.spyOn(transport as any, 'resolveCharacteristics');

    await expect(transport.acquire({ uuid, protocolHint: 'V2' })).resolves.toEqual({
      uuid,
      protocolType: 'V1',
    });

    expect(probeProtocolV2).toHaveBeenCalledTimes(1);
    expect(resolveCharacteristics).toHaveBeenCalledTimes(2);
    expect(transport.getProtocolType(uuid)).toBe('V1');
  });

  test('disconnects and invalidates a Protocol V1 link after a response timeout', async () => {
    const { transport, uuid, device } = createV1Harness();

    await transport.acquire({ uuid, expectedProtocol: 'V1' });
    await expect(transport.call(uuid, 'Initialize', {}, { timeoutMs: 5 })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleTimeoutError,
    });

    expect(device.cancelConnection).toHaveBeenCalled();
    expect(transport.getProtocolType(uuid)).toBeUndefined();
  });

  afterEach(() => {
    resetProtocolV2BleTuning();
  });

  test('keeps the Protocol V2 sequence across probe and the next call', async () => {
    const { transport, uuid, sentSeqs } = createHarness();

    await transport.acquire({ uuid });
    await transport.call(uuid, 'Ping', { message: 'after-probe' });

    expect(sentSeqs).toEqual([1, 2]);
    expect(bytesToHex(new Uint8Array([sentSeqs[0], sentSeqs[1]]))).toBe('0102');
    await transport.release(uuid, true);
  });

  test('rejects the active Protocol V2 reader when the current monitor errors', async () => {
    const harness = createHarness();
    const { transport, uuid, sentSeqs } = harness;
    await transport.acquire({ uuid });
    harness.setShouldRespond(false);

    const call = transport.call(uuid, 'Ping', { message: 'wait-for-monitor' }, { timeoutMs: 50 });
    while (sentSeqs.length < 2) {
      await Promise.resolve();
    }
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
    harness.emitMonitorError(Object.assign(new Error('monitor failed'), { reason: 'link lost' }));

    await expect(call).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleCharacteristicNotifyError,
    });
  });

  test('retains the sequence cursor when a new monitor generation is acquired', async () => {
    const { transport, uuid, sentSeqs } = createHarness();

    await transport.acquire({ uuid });
    await transport.release(uuid, true);
    await transport.acquire({ uuid });

    expect(sentSeqs).toEqual([1, 2]);
    await transport.release(uuid, true);
  });

  test('uses withoutResponse for normal and high-volume calls', async () => {
    const { transport, uuid, writeCharacteristic } = createHarness();

    await transport.acquire({ uuid });
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(1);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();

    await transport.call(uuid, 'Ping', { message: 'normal' });
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(2);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();

    await transport.call(uuid, 'FileWrite', {});
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(3);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    await transport.release(uuid, true);
  });

  test('rejects an active Protocol V2 reader when disconnect resets the link', async () => {
    const harness = createHarness();
    const { transport, uuid, sentSeqs } = harness;
    await transport.acquire({ uuid });
    harness.setShouldRespond(false);

    const call = transport.call(uuid, 'Ping', { message: 'disconnect' }, { timeoutMs: 50 });
    while (sentSeqs.length < 2) {
      await Promise.resolve();
    }

    const rejection = expect(call).rejects.toThrow('React Native BLE transport disconnected');
    await transport.disconnect(uuid);
    await rejection;
  });

  test('emits one disconnect event when the physical callback races manual cleanup', async () => {
    const harness = createHarness();
    const disconnectListener = jest.fn();
    harness.emitter.on(TRANSPORT_EVENT.DEVICE_DISCONNECT, disconnectListener);

    await harness.transport.acquire({ uuid: harness.uuid });
    harness.emitDisconnect();
    await harness.transport.disconnect(harness.uuid);

    expect(disconnectListener).toHaveBeenCalledTimes(1);
    expect(disconnectListener).toHaveBeenCalledWith({
      name: 'OneKey Pro 2',
      id: harness.uuid,
      connectId: harness.uuid,
    });
  });

  test('chunks large frames and retries only transient GATT congestion', async () => {
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 }) as any;
    const congested = { status: 143, message: 'GATT_CONGESTED' };
    const writeWithoutResponse = jest
      .fn()
      .mockRejectedValueOnce(congested)
      .mockResolvedValue(undefined);
    const bleTransport = {
      mtuSize: 23,
      writeCharacteristic: { writeWithoutResponse },
    };
    const context = {
      messageName: 'Ping',
      timeoutMs: 1000,
      highVolume: false,
      generation: 1,
      signal: new AbortController().signal,
    };
    const assertCurrentGeneration = jest.fn();
    configureProtocolV2BleTuning({ iosPacketLength: 20 });

    await transport.writeProtocolV2Frame(
      bleTransport,
      new Uint8Array(30),
      context,
      assertCurrentGeneration
    );

    expect(writeWithoutResponse).toHaveBeenCalledTimes(3);
    expect(writeWithoutResponse.mock.calls[0][0]).toBe(writeWithoutResponse.mock.calls[1][0]);
    expect(Buffer.from(writeWithoutResponse.mock.calls[2][0], 'base64')).toHaveLength(10);
    expect(assertCurrentGeneration).toHaveBeenCalled();
  });

  test('does not retry a disconnected Protocol V2 write inside a partial frame', async () => {
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 }) as any;
    const writeWithoutResponse = jest
      .fn()
      .mockRejectedValue({ errorCode: 205, message: 'Device disconnected' });
    const bleTransport = {
      mtuSize: 23,
      writeCharacteristic: { writeWithoutResponse },
    };
    const context = {
      messageName: 'FileWrite',
      timeoutMs: 1000,
      highVolume: true,
      generation: 1,
      signal: new AbortController().signal,
    };
    configureProtocolV2BleTuning({ iosPacketLength: 20 });

    await expect(
      transport.writeProtocolV2Frame(bleTransport, new Uint8Array(30), context, jest.fn())
    ).rejects.toMatchObject({ errorCode: 205 });
    expect(writeWithoutResponse).toHaveBeenCalledTimes(1);
  });
});
