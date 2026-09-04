import { EventEmitter } from 'events';
import transportPackage, {
  PROTOCOL_V2_CHANNEL_BLE_UART,
  ProtocolV2,
  TRANSPORT_EVENT,
} from '@onekeyfe/hd-transport';
import { HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport, {
  BLE_NATIVE_TEARDOWN_TIMEOUT_MS,
  BLE_WRITE_PACKET_TIMEOUT_MS,
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
  ConnectionPriority: { Balanced: 0, High: 1, LowPower: 2 },
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

const setPlatformOS = (os: 'ios' | 'android') => {
  const reactNative: { Platform: { OS: string } } = jest.requireMock('react-native');
  reactNative.Platform.OS = os;
};

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
    ProtocolInfoRequest: { fields: {} },
    Ping: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    DeviceInfoGet: { fields: {} },
    FileWrite: { fields: {} },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    MessageType: {
      values: {
        MessageType_ProtocolInfoRequest: 60200,
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
        MessageType_DeviceInfoGet: 60600,
        MessageType_FileWrite: 60805,
      },
    },
  },
};

const schemas = {
  protocolV1: parseConfigure(protocolV1Schema),
  protocolV2: parseConfigure(protocolV2Schema),
};

const createHarness = ({
  deviceName = 'OneKey Pro 2',
  isWritableWithResponse = true,
  monitorError,
}: {
  deviceName?: string;
  isWritableWithResponse?: boolean;
  monitorError?: (Error & { reason?: string; attErrorCode?: number; iosErrorCode?: number }) | null;
} = {}) => {
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
      if (monitorError) {
        queueMicrotask(() => callback(monitorError, null));
      }
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
    isWritableWithResponse,
    isWritableWithoutResponse: true,
    writeWithResponse: jest.fn(handleWrite),
    writeWithoutResponse: jest.fn(handleWrite),
  };
  const device = {
    id: uuid,
    name: deviceName,
    localName: deviceName,
    mtu: 247,
    serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
    isConnected: jest.fn(() => Promise.resolve(true)),
    cancelConnection: jest.fn(() => Promise.resolve()),
    onDisconnected: jest.fn(callback => {
      disconnectCallback = callback;
      return { remove: jest.fn() };
    }),
  } as any;
  device.requestMTU = jest.fn(() => Promise.resolve(device));
  device.requestConnectionPriority = jest.fn(() => Promise.resolve(device));
  const bleManager = {
    devices: jest.fn(() => Promise.resolve([device])),
    connectedDevices: jest.fn(() => Promise.resolve([])),
    cancelTransaction: jest.fn(() => Promise.resolve()),
    cancelDeviceConnection: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(),
  };
  const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
  const emitter = new EventEmitter();
  const logger = { debug: jest.fn(), error: jest.fn() };
  transport.blePlxManager = bleManager;
  transport.resolveCharacteristics = jest.fn(() =>
    Promise.resolve({ writeCharacteristic, notifyCharacteristic })
  );
  transport.init(logger, emitter);
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);

  return {
    transport,
    emitter,
    logger,
    uuid,
    device,
    bleManager,
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

const createV1Harness = ({
  respondOnWriteCount = 1,
  isWritableWithResponse = true,
}: {
  respondOnWriteCount?: number | number[];
  isWritableWithResponse?: boolean;
} = {}) => {
  const uuid = 'rn-classic-id';
  const notifySubscriptionRemovers: jest.Mock[] = [];
  const disconnectSubscriptionRemovers: jest.Mock[] = [];
  let notifyCallback:
    | ((error: Error | null, characteristic: { value: string } | null) => void)
    | undefined;
  const notifyCharacteristic = {
    uuid: '0003',
    deviceID: uuid,
    isNotifiable: true,
    monitor: jest.fn(callback => {
      notifyCallback = callback;
      const remove = jest.fn();
      notifySubscriptionRemovers.push(remove);
      return { remove };
    }),
  };
  let writeCount = 0;
  const responseWriteCounts = new Set(
    Array.isArray(respondOnWriteCount) ? respondOnWriteCount : [respondOnWriteCount]
  );
  const handleWrite = () => {
    writeCount += 1;
    if (responseWriteCounts.has(writeCount)) {
      notifyCallback?.(null, {
        value: Buffer.from('3f23230002000000040a026f6b', 'hex').toString('base64'),
      });
    }
    return Promise.resolve();
  };
  const writeCharacteristic = {
    uuid: '0002',
    deviceID: uuid,
    isWritableWithResponse,
    isWritableWithoutResponse: true,
    writeWithResponse: jest.fn(handleWrite),
    writeWithoutResponse: jest.fn(handleWrite),
  };
  const device = {
    id: uuid,
    name: 'OneKey Classic',
    localName: 'OneKey Classic',
    mtu: 247,
    serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
    isConnected: jest.fn(() => Promise.resolve(true)),
    cancelConnection: jest.fn(() => Promise.resolve()),
    onDisconnected: jest.fn(() => {
      const remove = jest.fn();
      disconnectSubscriptionRemovers.push(remove);
      return { remove };
    }),
  } as any;
  device.requestMTU = jest.fn(() => Promise.resolve(device));
  const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
  const bleManager = {
    devices: jest.fn(() => Promise.resolve([device])),
    connectedDevices: jest.fn(() => Promise.resolve([])),
    cancelTransaction: jest.fn(() => Promise.resolve()),
  };
  transport.blePlxManager = bleManager as any;
  transport.resolveCharacteristics = jest.fn(() =>
    Promise.resolve({ writeCharacteristic, notifyCharacteristic })
  );
  transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);
  return {
    transport,
    uuid,
    device,
    bleManager,
    writeCharacteristic,
    notifySubscriptionRemovers,
    disconnectSubscriptionRemovers,
  };
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

  test.each(['status 143', 'status:143', 'status = 143', 'GATT_CONGESTED'])(
    'classifies %s as transient GATT congestion',
    message => {
      expect(getFirmwareUploadWriteRetryType({ message })).toBe('congested');
    }
  );

  test('handles long uncontrolled status messages without a backtracking regular expression', () => {
    const message = `status${' '.repeat(100_000)}142`;

    expect(getFirmwareUploadWriteRetryType({ message })).toBeNull();
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

  test('connects the Android GATT link before starting system bonding', async () => {
    setPlatformOS('android');
    const { transport, uuid, device } = createHarness();
    const operationOrder: string[] = [];
    const pairDeviceMock = jest.requireMock('../BleManager').pairDevice as jest.Mock;

    device.isConnected.mockResolvedValueOnce(false);
    device.connect = jest.fn(() => {
      operationOrder.push('connect');
      return Promise.resolve(device);
    });
    pairDeviceMock.mockImplementationOnce(() => {
      operationOrder.push('bond');
      return Promise.resolve({ bonded: true, bonding: false });
    });

    await expect(transport.acquire({ uuid, expectedProtocol: 'V2' })).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });

    expect(operationOrder).toEqual(['connect', 'bond']);
    await transport.release(uuid, true);
  });

  test('does not start Android bonding when both reconnect attempts fail', async () => {
    setPlatformOS('android');
    const { transport, uuid, device } = createHarness();
    const BleErrorMock = jest.requireMock('react-native-ble-plx').BleError as new (
      message: string
    ) => Error;
    const pairDeviceMock = jest.requireMock('../BleManager').pairDevice as jest.Mock;
    const firstError = Object.assign(new BleErrorMock('MTU change failed'), {
      errorCode: 206,
      reason: 'MTU change failed',
    });
    const fallbackError = Object.assign(new BleErrorMock('GATT connect failed'), {
      errorCode: 205,
      reason: 'GATT connect failed',
    });

    device.isConnected.mockResolvedValueOnce(false);
    device.connect = jest
      .fn()
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(fallbackError);
    pairDeviceMock.mockClear();

    await expect(transport.acquire({ uuid, expectedProtocol: 'V2' })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleConnectedError,
    });
    expect(device.connect).toHaveBeenCalledTimes(2);
    expect(pairDeviceMock).not.toHaveBeenCalled();
  });

  test('checks that the Android GATT link is connected before bonding', async () => {
    setPlatformOS('android');
    const { transport, uuid, device } = createHarness();
    const pairDeviceMock = jest.requireMock('../BleManager').pairDevice as jest.Mock;

    device.isConnected.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    device.connect = jest.fn().mockResolvedValue(device);
    pairDeviceMock.mockClear();

    await expect(transport.acquire({ uuid, expectedProtocol: 'V2' })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleConnectedError,
    });
    expect(pairDeviceMock).not.toHaveBeenCalled();
  });

  test.each([
    [
      'ios',
      'OneKey Neo',
      {
        iosErrorCode: 14,
        reason: 'Peer removed pairing information',
      },
      HardwareErrorCode.BlePeerRemovedPairingInformation,
    ],
    [
      'android',
      'OneKey Pro 2',
      {
        androidErrorCode: 5,
        reason: 'Connection state changed with status 5',
      },
      HardwareErrorCode.BleDeviceBondError,
    ],
  ] as const)(
    'maps a %s %s stale bond during connect before protocol detection',
    async (platform, deviceName, nativeError, errorCode) => {
      setPlatformOS(platform);
      const { transport, uuid, device } = createHarness({ deviceName });
      const BleErrorMock = jest.requireMock('react-native-ble-plx').BleError as new (
        message: string
      ) => Error;
      const pairDeviceMock = jest.requireMock('../BleManager').pairDevice as jest.Mock;
      pairDeviceMock.mockClear();

      device.isConnected.mockResolvedValueOnce(false);
      device.connect = jest
        .fn()
        .mockRejectedValue(Object.assign(new BleErrorMock(nativeError.reason), nativeError));

      await expect(transport.acquire({ uuid })).rejects.toMatchObject({ errorCode });
      expect(pairDeviceMock).not.toHaveBeenCalled();
      expect(transport.getProtocolType(uuid)).toBeUndefined();
    }
  );

  test('closes the Android GATT link when system bonding fails', async () => {
    setPlatformOS('android');
    const { transport, uuid, device, bleManager } = createHarness();
    const pairDeviceMock = jest.requireMock('../BleManager').pairDevice as jest.Mock;

    pairDeviceMock.mockRejectedValueOnce(new Error('bonding canceled'));

    await expect(transport.acquire({ uuid, expectedProtocol: 'V2' })).rejects.toThrow(
      'bonding canceled'
    );

    expect(bleManager.cancelDeviceConnection).toHaveBeenCalledWith(uuid);
    expect(device.cancelConnection).toHaveBeenCalledTimes(1);
  });

  test('uses withResponse for consecutive iOS Protocol V1 control commands without releasing', async () => {
    const { transport, uuid, writeCharacteristic } = createV1Harness({
      respondOnWriteCount: [1, 2],
    });

    await expect(transport.acquire({ uuid, expectedProtocol: 'V1' })).resolves.toEqual({
      uuid,
      protocolType: 'V1',
    });
    const releaseNative = jest.spyOn(transport as any, 'releaseNative');
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithoutResponse).not.toHaveBeenCalled();

    await expect(transport.call(uuid, 'Initialize', {}, { timeoutMs: 50 })).resolves.toBeDefined();
    await expect(transport.call(uuid, 'GetFeatures', {}, { timeoutMs: 50 })).resolves.toBeDefined();

    expect(writeCharacteristic.writeWithResponse).toHaveBeenCalledTimes(2);
    expect(writeCharacteristic.writeWithoutResponse).not.toHaveBeenCalled();
    expect(releaseNative).not.toHaveBeenCalled();
    await transport.release(uuid, true);
  });

  test('falls back to withoutResponse for an iOS Protocol V1 control command when required', async () => {
    const { transport, uuid, writeCharacteristic } = createV1Harness({
      isWritableWithResponse: false,
    });

    await transport.acquire({ uuid, expectedProtocol: 'V1' });
    await expect(transport.call(uuid, 'Initialize', {}, { timeoutMs: 50 })).resolves.toBeDefined();

    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(1);
    await transport.release(uuid, true);
  });

  test('does not resend a failed iOS Protocol V1 control write without response', async () => {
    const { transport, uuid, writeCharacteristic } = createV1Harness();
    const writeError = new Error('write with response failed');

    await transport.acquire({ uuid, expectedProtocol: 'V1' });
    writeCharacteristic.writeWithResponse.mockRejectedValueOnce(writeError);

    await expect(transport.call(uuid, 'Initialize', {}, { timeoutMs: 50 })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleWriteCharacteristicError,
    });
    expect(writeCharacteristic.writeWithResponse).toHaveBeenCalledTimes(1);
    expect(writeCharacteristic.writeWithoutResponse).not.toHaveBeenCalled();
    await transport.release(uuid, true);
  });

  test('keeps native stale-bond write mapping out of Protocol V1 calls', async () => {
    const { transport, uuid, writeCharacteristic } = createV1Harness();
    const nativeError = Object.assign(new Error('Encryption is insufficient'), {
      attErrorCode: 15,
      reason: 'Encryption is insufficient',
    });

    await transport.acquire({ uuid, expectedProtocol: 'V1' });
    writeCharacteristic.writeWithResponse.mockRejectedValueOnce(nativeError);

    await expect(transport.call(uuid, 'Initialize', {}, { timeoutMs: 50 })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleWriteCharacteristicError,
    });
    await transport.release(uuid, true);
  });

  test('detects Protocol V2 on iOS without using the BLE name as a protocol hint', async () => {
    const { transport, uuid, device, sentSeqs, writeCharacteristic } = createHarness({
      deviceName: 'Pro2 6E9E',
    });

    await expect(transport.acquire({ uuid })).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });
    expect(device.requestMTU).toHaveBeenCalledWith(247);
    expect(writeCharacteristic.writeWithResponse).toHaveBeenCalledTimes(1);
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalled();

    await expect(
      transport.call(uuid, 'Ping', { message: 'first-core-command' })
    ).resolves.toBeDefined();
    expect(sentSeqs.filter(seq => seq > 0)).toEqual([1, 2]);
    await transport.release(uuid, true);
  });

  test('physically refreshes an uncached Protocol V2 firmware install link without Ping', async () => {
    const { transport, uuid, device, bleManager, writeCharacteristic } = createHarness();
    const probeProtocolV2 = jest.spyOn(transport as any, 'probeProtocolV2');
    (transport as any).sessionProtocols.set(uuid, 'V2');
    device.connect = jest.fn().mockResolvedValue(device);
    device.isConnected.mockResolvedValueOnce(false);

    await expect(
      transport.acquire({ uuid, expectedProtocol: 'V2', skipProtocolProbe: true })
    ).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });

    expect(bleManager.cancelDeviceConnection).toHaveBeenCalledWith(uuid);
    expect(device.cancelConnection).not.toHaveBeenCalled();
    expect(device.connect).toHaveBeenCalled();
    expect(probeProtocolV2).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithoutResponse).not.toHaveBeenCalled();
    expect(transport.getProtocolType(uuid)).toBe('V2');
    await transport.release(uuid, true);
  });

  test('refreshes a cached firmware install connection instead of trusting GATT state', async () => {
    const { transport, uuid, device, bleManager, writeCharacteristic } = createHarness();
    const probeProtocolV2 = jest.spyOn(transport as any, 'probeProtocolV2');

    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    device.connect = jest.fn().mockResolvedValue(device);
    device.isConnected.mockResolvedValueOnce(false);
    writeCharacteristic.writeWithResponse.mockClear();
    writeCharacteristic.writeWithoutResponse.mockClear();

    await expect(
      transport.acquire({ uuid, expectedProtocol: 'V2', skipProtocolProbe: true })
    ).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });

    expect(bleManager.cancelDeviceConnection).toHaveBeenCalledWith(uuid);
    expect(device.cancelConnection).toHaveBeenCalled();
    expect(device.connect).toHaveBeenCalled();
    expect(probeProtocolV2).toHaveBeenCalledTimes(1);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithoutResponse).not.toHaveBeenCalled();
    await transport.release(uuid, true);
  });

  test('rejects no-probe acquire before the BLE endpoint has confirmed a protocol', async () => {
    const { transport, uuid } = createHarness();

    await expect(
      transport.acquire({ uuid, expectedProtocol: 'V2', skipProtocolProbe: true })
    ).rejects.toThrow('previously confirmed protocol');

    expect(transport.getProtocolType(uuid)).toBeUndefined();
  });

  test('keeps confirmed V2 authorization across a BLE manager reset', async () => {
    const { transport, uuid, device, bleManager, writeCharacteristic } = createHarness();
    const probeProtocolV2 = jest.spyOn(transport as any, 'probeProtocolV2');

    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    expect(probeProtocolV2).toHaveBeenCalledTimes(1);

    (transport as any).resetPlxManager();
    transport.blePlxManager = bleManager as any;
    device.connect = jest.fn().mockResolvedValue(device);
    device.isConnected.mockResolvedValueOnce(false);
    writeCharacteristic.writeWithResponse.mockClear();
    writeCharacteristic.writeWithoutResponse.mockClear();

    await expect(
      transport.acquire({ uuid, expectedProtocol: 'V2', skipProtocolProbe: true })
    ).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });

    expect(probeProtocolV2).toHaveBeenCalledTimes(1);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithoutResponse).not.toHaveBeenCalled();
    await transport.release(uuid, true);
  });

  test.each(['ios', 'android'] as const)(
    'keeps a first expected Protocol V2 probe miss retryable on %s',
    async platform => {
      setPlatformOS(platform);
      const { transport, uuid, device } = createHarness();
      jest.spyOn(transport as any, 'probeProtocolV2').mockResolvedValue(false);

      await expect(transport.acquire({ uuid, expectedProtocol: 'V2' })).rejects.toMatchObject({
        errorCode: HardwareErrorCode.RuntimeError,
      });

      expect(device.cancelConnection).not.toHaveBeenCalled();
      expect(transport.getProtocolType(uuid)).toBeUndefined();
    }
  );

  test.each(['ios', 'android'] as const)(
    'keeps a second expected Protocol V2 probe miss retryable on %s',
    async platform => {
      setPlatformOS(platform);
      const { transport, uuid, device } = createHarness();
      jest.spyOn(transport as any, 'probeProtocolV2').mockResolvedValue(false);

      await expect(transport.acquire({ uuid, expectedProtocol: 'V2' })).rejects.toMatchObject({
        errorCode: HardwareErrorCode.RuntimeError,
      });
      await expect(transport.acquire({ uuid, expectedProtocol: 'V2' })).rejects.toMatchObject({
        errorCode: HardwareErrorCode.RuntimeError,
      });

      expect(device.cancelConnection).not.toHaveBeenCalled();
      expect(transport.getProtocolType(uuid)).toBeUndefined();
    }
  );

  test.each([
    [
      'Encryption is insufficient',
      { reason: 'Encryption is insufficient', attErrorCode: 15 },
      HardwareErrorCode.BleDeviceBondError,
    ],
    [
      'Peer removed pairing information',
      { reason: 'Peer removed pairing information', iosErrorCode: 14 },
      HardwareErrorCode.BlePeerRemovedPairingInformation,
    ],
  ] as const)(
    'fails Protocol V2 acquire immediately on %s instead of waiting for Ping',
    async (_label, nativeError, errorCode) => {
      const { transport, uuid, device } = createHarness({
        monitorError: Object.assign(new Error(nativeError.reason), nativeError),
      });
      const probe = jest.spyOn(transport as any, 'probeProtocolV2');

      await expect(transport.acquire({ uuid, expectedProtocol: 'V2' })).rejects.toMatchObject({
        errorCode,
      });

      expect(probe).not.toHaveBeenCalled();
      expect(device.cancelConnection).toHaveBeenCalled();
      expect(transport.getProtocolType(uuid)).toBeUndefined();
    }
  );

  test.each(['ios', 'android'] as const)(
    'keeps a confirmed Protocol V2 probe miss retryable on %s without native bond evidence',
    async platform => {
      setPlatformOS(platform);
      const { transport, uuid, device } = createHarness();
      await transport.acquire({ uuid, expectedProtocol: 'V2' });
      await transport.release(uuid, true);
      jest.spyOn(transport as any, 'probeProtocolV2').mockResolvedValue(false);

      await expect(transport.acquire({ uuid, expectedProtocol: 'V2' })).rejects.toMatchObject({
        errorCode: HardwareErrorCode.RuntimeError,
      });

      expect(device.cancelConnection).not.toHaveBeenCalled();
      expect(transport.getProtocolType(uuid)).toBeUndefined();
    }
  );

  test('waits for an in-flight release before reacquiring the same device', async () => {
    const { transport, uuid } = createHarness();
    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    const releaseGate = createDeferred<void>();
    const releaseStarted = createDeferred<void>();
    const { protocolV2Links } = transport as any;
    const invalidateLink = protocolV2Links.invalidateLink.bind(protocolV2Links);
    jest
      .spyOn(protocolV2Links, 'invalidateLink')
      .mockImplementationOnce(async (...args: unknown[]) => {
        releaseStarted.resolve();
        await releaseGate.promise;
        return invalidateLink(...args);
      });

    const release = transport.release(uuid, true);
    await releaseStarted.promise;
    let reacquired = false;
    const acquire = transport.acquire({ uuid, expectedProtocol: 'V2' }).then(result => {
      reacquired = true;
      return result;
    });

    await Promise.resolve();
    expect(reacquired).toBe(false);

    releaseGate.resolve();
    await release;
    await expect(acquire).resolves.toEqual({ uuid, protocolType: 'V2' });
    await expect(transport.call(uuid, 'Ping', { message: 'after-release' })).resolves.toMatchObject(
      {
        type: 'Success',
        message: { message: 'ok' },
      }
    );
  });

  test(
    'releases the lifecycle queue when native teardown never settles',
    async () => {
      const { transport, uuid, device, bleManager } = createHarness();
      await transport.acquire({ uuid, expectedProtocol: 'V2' });
      const otherUuid = 'rn-pro2-other-id';
      const otherDevice = {
        ...device,
        id: otherUuid,
        name: 'OneKey Pro 2 Other',
        localName: 'OneKey Pro 2 Other',
      };
      await (transport as any).installTransportForAcquire(otherUuid, otherDevice);
      (transport as any).deviceProtocol.set(otherUuid, 'V2');
      const disconnectEvents: Array<{ connectId: string }> = [];
      transport.emitter?.on(TRANSPORT_EVENT.DEVICE_DISCONNECT, event => {
        disconnectEvents.push(event);
      });
      const stalledNativeCleanup = createDeferred<void>();
      bleManager.cancelTransaction
        .mockImplementationOnce(() => stalledNativeCleanup.promise)
        .mockResolvedValue(undefined);
      const resetPlxManager = jest.spyOn(transport as any, 'resetPlxManager');
      const nextLifecycleOperation = jest.fn().mockResolvedValue('next-operation');

      const release = transport.release(uuid, true);
      const nextOperation = (transport as any).runLifecycleOperation(uuid, nextLifecycleOperation);

      await expect(release).resolves.toBe(true);
      await expect(nextOperation).resolves.toBe('next-operation');
      expect(resetPlxManager).toHaveBeenCalledTimes(1);
      expect(nextLifecycleOperation).toHaveBeenCalledTimes(1);
      expect(disconnectEvents).toContainEqual(expect.objectContaining({ connectId: otherUuid }));
      expect(() => (transport as any).getCachedTransport(otherUuid)).toThrow();

      await (transport as any).installTransportForAcquire(uuid, device);
      (transport as any).deviceProtocol.set(uuid, 'V2');

      stalledNativeCleanup.resolve();
      await Promise.resolve();
      await expect(
        transport.call(uuid, 'Ping', { message: 'after-stale-cleanup' })
      ).resolves.toMatchObject({
        type: 'Success',
        message: { message: 'ok' },
      });
    },
    BLE_NATIVE_TEARDOWN_TIMEOUT_MS + 5_000
  );

  test('falls back to the other active probe on iOS when protocol metadata is absent', async () => {
    const { transport, uuid } = createHarness({ deviceName: 'OneKey' });
    const probeProtocolV1 = jest
      .spyOn(transport as any, 'probeProtocolV1')
      .mockResolvedValue(false);
    const probeProtocolV2 = jest.spyOn(transport as any, 'probeProtocolV2').mockResolvedValue(true);

    await expect(transport.acquire({ uuid })).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });

    expect(probeProtocolV1).toHaveBeenCalledTimes(1);
    expect(probeProtocolV2).toHaveBeenCalledTimes(1);
    expect(probeProtocolV1.mock.invocationCallOrder[0]).toBeLessThan(
      probeProtocolV2.mock.invocationCallOrder[0]
    );
    await transport.release(uuid, true);
  });

  test('continues with the current MTU when the connected snapshot refresh fails', async () => {
    const { transport, uuid, device } = createHarness();
    const mtuError = new Error('MTU refresh failed');
    device.requestMTU.mockRejectedValueOnce(mtuError);

    await expect(transport.acquire({ uuid })).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });
    expect(device.requestMTU).toHaveBeenCalledTimes(1);
    expect((transport as any).getCachedTransport(uuid).mtuSize).toBe(247);
    await transport.release(uuid, true);
  });

  test('refreshes a transient bootloader MTU after notifications are ready', async () => {
    const { transport, uuid, device } = createHarness();
    device.mtu = 23;
    device.requestMTU
      .mockResolvedValueOnce(device)
      .mockResolvedValueOnce(device)
      .mockImplementationOnce(() => {
        device.mtu = 247;
        return Promise.resolve(device);
      });

    await expect(transport.acquire({ uuid })).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });
    expect(device.requestMTU).toHaveBeenCalledTimes(3);
    expect((transport as any).getCachedTransport(uuid).mtuSize).toBe(247);
    await transport.release(uuid, true);
  });

  test('continues with a low bootloader MTU when the bounded retry fails', async () => {
    const { transport, uuid, device } = createHarness();
    device.mtu = 23;
    device.requestMTU
      .mockResolvedValueOnce(device)
      .mockResolvedValueOnce(device)
      .mockRejectedValueOnce(new Error('bootloader MTU retry failed'));

    await expect(transport.acquire({ uuid })).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });
    expect(device.requestMTU).toHaveBeenCalledTimes(3);
    expect((transport as any).getCachedTransport(uuid).mtuSize).toBe(23);
    await transport.release(uuid, true);
  });

  test('accepts a stable low MTU without the delayed refresh loop', async () => {
    const { transport, uuid, device } = createHarness();
    device.mtu = 185;

    await expect(transport.acquire({ uuid })).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });
    expect(device.requestMTU).toHaveBeenCalledTimes(1);
    expect((transport as any).getCachedTransport(uuid).mtuSize).toBe(185);
    await transport.release(uuid, true);
  });

  test('continues Protocol V2 probing with a conservative packet size when MTU is unavailable', async () => {
    const { transport, uuid, device, writeCharacteristic } = createHarness();
    device.mtu = undefined;

    await expect(transport.acquire({ uuid })).resolves.toEqual({
      uuid,
      protocolType: 'V2',
    });
    expect(device.requestMTU).toHaveBeenCalledTimes(3);
    expect((transport as any).getCachedTransport(uuid).mtuSize).toBeUndefined();
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalled();
    await transport.release(uuid, true);
  });

  test('refreshes an unavailable MTU before a Protocol V2 high-volume write', async () => {
    const { transport, uuid, device, writeCharacteristic } = createHarness();
    device.mtu = undefined;

    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    const writesBeforeFileWrite = writeCharacteristic.writeWithoutResponse.mock.calls.length;
    device.requestMTU.mockImplementationOnce(() => {
      device.mtu = 247;
      return Promise.resolve(device);
    });

    await expect(transport.call(uuid, 'FileWrite', {})).resolves.toBeDefined();
    expect(device.requestMTU).toHaveBeenCalledTimes(4);
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(
      writesBeforeFileWrite + 1
    );
    await transport.release(uuid, true);
  });

  test('rejects a Protocol V2 high-volume write when MTU remains unavailable', async () => {
    const { transport, uuid, device, writeCharacteristic } = createHarness();
    device.mtu = undefined;

    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    const writesBeforeFileWrite = writeCharacteristic.writeWithoutResponse.mock.calls.length;

    await expect(transport.call(uuid, 'FileWrite', {})).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleConnectedError,
    });
    expect(device.requestMTU).toHaveBeenCalledTimes(4);
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(writesBeforeFileWrite);
    await transport.release(uuid, true);
  });

  test('reconnects before falling back to Protocol V1 after a fatal V2 probe failure', async () => {
    setPlatformOS('android');
    const { transport, uuid, device, notifySubscriptionRemovers, disconnectSubscriptionRemovers } =
      createV1Harness();
    const probeProtocolV2 = jest
      .spyOn(transport as any, 'probeProtocolV2')
      .mockImplementation(async () => {
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
    expect(device.onDisconnected).toHaveBeenCalledTimes(1);
    expect(notifySubscriptionRemovers).toHaveLength(2);
    expect(notifySubscriptionRemovers[0]).toHaveBeenCalledTimes(1);

    await transport.release(uuid, true);

    expect(notifySubscriptionRemovers[1]).toHaveBeenCalledTimes(1);
    expect(disconnectSubscriptionRemovers).toHaveLength(1);
    expect(disconnectSubscriptionRemovers[0]).toHaveBeenCalledTimes(1);
  });

  test('cleans the rebuilt transport when Protocol V1 fallback also fails', async () => {
    setPlatformOS('android');
    const { transport, uuid, device, bleManager, notifySubscriptionRemovers } = createV1Harness();
    jest.spyOn(transport as any, 'probeProtocolV2').mockImplementation(async () => {
      await (transport as any).releaseNative(uuid, true);
      return false;
    });
    jest.spyOn(transport as any, 'probeProtocolV1').mockResolvedValue(false);

    await expect(transport.acquire({ uuid, protocolHint: 'V2' })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleTimeoutError,
    });

    expect(device.onDisconnected).not.toHaveBeenCalled();
    expect(notifySubscriptionRemovers).toHaveLength(2);
    expect(notifySubscriptionRemovers[0]).toHaveBeenCalledTimes(1);
    expect(notifySubscriptionRemovers[1]).toHaveBeenCalledTimes(1);
    expect(bleManager.cancelTransaction).toHaveBeenCalled();
    expect(transport.getProtocolType(uuid)).toBeUndefined();
  });

  test('disconnects and invalidates a Protocol V1 link after a response timeout', async () => {
    const { transport, uuid, device } = createV1Harness({
      respondOnWriteCount: Number.POSITIVE_INFINITY,
    });

    await transport.acquire({ uuid, expectedProtocol: 'V1' });
    await expect(transport.call(uuid, 'Initialize', {}, { timeoutMs: 5 })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleTimeoutError,
    });

    expect(device.cancelConnection).toHaveBeenCalled();
    expect(transport.getProtocolType(uuid)).toBeUndefined();
  });

  afterEach(() => {
    setPlatformOS('ios');
    resetProtocolV2BleTuning();
  });

  test('uses the first Protocol V2 sequence for the first Core call when protocol is known', async () => {
    const { transport, uuid, sentSeqs } = createHarness();

    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    await transport.call(uuid, 'Ping', { message: 'first-core-command' });

    expect(sentSeqs).toEqual([1, 2]);
    await transport.release(uuid, true);
  });

  test('rejects the active Protocol V2 reader when the current monitor errors', async () => {
    const harness = createHarness();
    const { transport, uuid, sentSeqs } = harness;
    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    harness.setShouldRespond(false);

    const call = transport.call(uuid, 'Ping', { message: 'wait-for-monitor' }, { timeoutMs: 50 });
    while (sentSeqs.length < 1) {
      await new Promise(resolve => {
        setTimeout(resolve, 0);
      });
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

    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    await transport.call(uuid, 'Ping', { message: 'first-generation' });
    await transport.release(uuid, true);
    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    await transport.call(uuid, 'Ping', { message: 'second-generation' });

    expect(sentSeqs).toEqual([1, 2, 3, 4]);
    await transport.release(uuid, true);
  });

  test('uses withoutResponse for consecutive iOS Protocol V2 control calls without releasing', async () => {
    const { transport, uuid, writeCharacteristic } = createHarness();

    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    const releaseNative = jest.spyOn(transport as any, 'releaseNative');
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(1);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();

    await transport.call(uuid, 'DeviceInfoGet', {});
    await transport.call(uuid, 'ProtocolInfoRequest', {});

    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(3);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(releaseNative).not.toHaveBeenCalled();

    await transport.release(uuid, true);
  });

  test('keeps iOS Protocol V2 high-volume calls on withoutResponse', async () => {
    const { transport, uuid, logger, writeCharacteristic } = createHarness();

    await transport.acquire({ uuid, expectedProtocol: 'V2' });

    await transport.call(uuid, 'FileWrite', {});
    await transport.call(uuid, 'FileWrite', {});
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(3);
    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(
      logger.debug.mock.calls.filter(
        ([message]) =>
          message === '[ReactNativeBleTransport] Protocol V2 high-volume write configured'
      )
    ).toHaveLength(1);
    await transport.release(uuid, true);
  });

  test('uses Android 517 MTU and high connection priority during Protocol V2 high-volume calls', async () => {
    setPlatformOS('android');
    const { transport, uuid, device } = createHarness();

    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    expect(device.requestMTU).toHaveBeenCalledWith(517);

    await transport.call(uuid, 'FileWrite', {});
    await transport.call(uuid, 'FileWrite', {});

    expect(device.requestConnectionPriority).toHaveBeenCalledTimes(1);
    expect(device.requestConnectionPriority).toHaveBeenCalledWith(1);

    await transport.release(uuid, true);
    expect(device.requestConnectionPriority).toHaveBeenLastCalledWith(0);
  });

  test('uses withResponse for an iOS Protocol V2 firmware file write when requested', async () => {
    const { transport, uuid, writeCharacteristic } = createHarness();

    await transport.acquire({ uuid, expectedProtocol: 'V2' });

    await transport.call(uuid, 'FileWrite', {}, { writeWithResponse: true });
    expect(writeCharacteristic.writeWithResponse).toHaveBeenCalledTimes(1);
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(1);
    await transport.release(uuid, true);
  });

  test('falls back to withoutResponse for an iOS Protocol V2 control call when required', async () => {
    const { transport, uuid, writeCharacteristic } = createHarness({
      isWritableWithResponse: false,
    });

    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    await transport.call(uuid, 'ProtocolInfoRequest', {});

    expect(writeCharacteristic.writeWithResponse).not.toHaveBeenCalled();
    expect(writeCharacteristic.writeWithoutResponse).toHaveBeenCalledTimes(2);
    await transport.release(uuid, true);
  });

  test('does not resend a failed iOS Protocol V2 control write without response', async () => {
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 }) as any;
    const writeError = new Error('write with response failed');
    const writeWithResponse = jest.fn().mockRejectedValue(writeError);
    const writeWithoutResponse = jest.fn().mockResolvedValue(undefined);
    const context = {
      messageName: 'ProtocolInfoRequest',
      timeoutMs: 1000,
      highThroughput: false,
      generation: 1,
      signal: new AbortController().signal,
    };

    await expect(
      transport.writeProtocolV2Packet(
        'test-device',
        {
          writeCharacteristic: {
            isWritableWithResponse: true,
            writeWithResponse,
            writeWithoutResponse,
          },
        },
        Buffer.from('control').toString('base64'),
        context,
        jest.fn()
      )
    ).rejects.toBe(writeError);
    expect(writeWithResponse).toHaveBeenCalledTimes(1);
    expect(writeWithoutResponse).not.toHaveBeenCalled();
  });

  test('does not pace a one-packet Protocol V2 control write on iOS', async () => {
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 }) as any;
    const writeWithoutResponse = jest.fn().mockResolvedValue(undefined);
    const bleTransport = {
      mtuSize: 23,
      writeCharacteristic: { writeWithoutResponse },
    };
    const context = {
      messageName: 'ProtocolInfoRequest',
      timeoutMs: 1000,
      highThroughput: false,
      generation: 1,
      signal: new AbortController().signal,
    };
    configureProtocolV2BleTuning({ iosPacketLength: 20 });
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    try {
      const call = transport.writeProtocolV2Frame(
        'test-device',
        bleTransport,
        new Uint8Array(10),
        context,
        jest.fn()
      );

      await call;
      // The only scheduled timer is the per-packet BLE write watchdog: no pacing delay.
      expect(setTimeoutSpy.mock.calls.map(([, timeout]) => timeout)).toEqual([
        BLE_WRITE_PACKET_TIMEOUT_MS,
      ]);
      expect(writeWithoutResponse).toHaveBeenCalledTimes(1);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  test('rejects an active Protocol V2 reader when disconnect resets the link', async () => {
    const harness = createHarness();
    const { transport, uuid, sentSeqs } = harness;
    await transport.acquire({ uuid, expectedProtocol: 'V2' });
    harness.setShouldRespond(false);

    const call = transport.call(uuid, 'Ping', { message: 'disconnect' }, { timeoutMs: 50 });
    while (sentSeqs.length < 1) {
      await new Promise(resolve => {
        setTimeout(resolve, 0);
      });
    }

    const rejection = expect(call).rejects.toThrow('React Native BLE transport disconnected');
    await transport.disconnect(uuid);
    await rejection;
  });

  test('emits one disconnect event when the physical callback races manual cleanup', async () => {
    const harness = createHarness();
    const disconnectListener = jest.fn();
    harness.emitter.on(TRANSPORT_EVENT.DEVICE_DISCONNECT, disconnectListener);

    await harness.transport.acquire({ uuid: harness.uuid, expectedProtocol: 'V2' });
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
      highThroughput: false,
      generation: 1,
      signal: new AbortController().signal,
    };
    const assertCurrentGeneration = jest.fn();
    configureProtocolV2BleTuning({ iosPacketLength: 20 });

    await transport.writeProtocolV2Frame(
      'device-uuid',
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
      highThroughput: true,
      generation: 1,
      signal: new AbortController().signal,
    };
    configureProtocolV2BleTuning({ iosPacketLength: 20 });

    await expect(
      transport.writeProtocolV2Frame(
        'device-uuid',
        bleTransport,
        new Uint8Array(30),
        context,
        jest.fn()
      )
    ).rejects.toMatchObject({ errorCode: 205 });
    expect(writeWithoutResponse).toHaveBeenCalledTimes(1);
  });

  test('does not apply fixed burst or flush pauses to high-volume Protocol V2 writes', async () => {
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 }) as any;
    const writeWithoutResponse = jest.fn().mockResolvedValue(undefined);
    const bleTransport = {
      mtuSize: 247,
      writeCharacteristic: { writeWithoutResponse },
    };
    const context = {
      messageName: 'FileWrite',
      timeoutMs: 1000,
      highThroughput: true,
      generation: 1,
      signal: new AbortController().signal,
    };
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    try {
      await transport.writeProtocolV2Frame(
        'test-device',
        bleTransport,
        new Uint8Array(600),
        context,
        jest.fn()
      );

      expect(writeWithoutResponse).toHaveBeenCalledTimes(3);
      // One BLE write watchdog per packet and nothing else: no burst or flush pauses.
      expect(setTimeoutSpy.mock.calls.map(([, timeout]) => timeout)).toEqual([
        BLE_WRITE_PACKET_TIMEOUT_MS,
        BLE_WRITE_PACKET_TIMEOUT_MS,
        BLE_WRITE_PACKET_TIMEOUT_MS,
      ]);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });
});
