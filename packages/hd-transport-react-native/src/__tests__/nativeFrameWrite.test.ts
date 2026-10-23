import { EventEmitter } from 'events';
import transportPackage, {
  PROTOCOL_V2_BLE_FRAME_MAX_BYTES,
  PROTOCOL_V2_CHANNEL_BLE_UART,
  ProtocolV2,
  ProtocolV2FrameAssembler,
} from '@onekeyfe/hd-transport';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport, {
  BLE_WRITE_PACKET_TIMEOUT_MS,
  configureProtocolV2BleTuning,
  getProtocolV2BleTuning,
  resetProtocolV2BleTuning,
} from '../index';
import protocolV1SchemaFixture from './protocolV1SchemaFixture';

jest.mock(
  'react-native',
  () => ({
    PermissionsAndroid: {},
    Platform: { OS: 'android' },
  }),
  { virtual: true }
);

jest.mock('react-native-ble-plx', () => ({
  BleATTErrorCode: { UnlikelyError: 14 },
  BleError: class BleError extends Error {},
  BleErrorCode: {
    DeviceAlreadyConnected: 203,
    DeviceDisconnected: 201,
    DeviceMTUChangeFailed: 206,
    OperationCancelled: 2,
    OperationStartFailed: 601,
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

type Platform = 'ios' | 'android';

const setPlatformOS = (os: Platform) => {
  const reactNative: { Platform: { OS: string } } = jest.requireMock('react-native');
  reactNative.Platform.OS = os;
};

const { parseConfigure } = transportPackage;

const FRAME_TX_PATTERN = /^dev:v2frame:3:\d+$/;
const PACKET_CAPACITY = 244;
const PERF_MESSAGE = '[ReactNativeBleTransport] FileWrite perf';
const MODE_MESSAGE = '[ReactNativeBleTransport] Protocol V2 frame write mode';

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

const createFrame = (length: number) => Uint8Array.from({ length }, (_, index) => index % 251);

const neverSettles = () =>
  new Promise<void>(() => {
    // never settles
  });

type FrameWrite = (
  characteristicIdentifier: number,
  base64Frame: string,
  packetSize: number,
  transactionId: string
) => Promise<void>;

const createFrameManager = ({
  supported = true,
  write = () => Promise.resolve(),
}: {
  supported?: boolean | (() => boolean);
  write?: FrameWrite;
} = {}) => ({
  isWriteCharacteristicWithoutResponseFrameSupported: jest.fn(
    typeof supported === 'function' ? supported : () => supported
  ),
  writeCharacteristicWithoutResponseFrame: jest.fn(write),
  cancelTransaction: jest.fn(() => Promise.resolve()),
  cancelDeviceConnection: jest.fn(() => Promise.resolve()),
  destroy: jest.fn(),
});

const createUnit = ({
  manager,
  characteristicId = 42,
}: {
  manager?: unknown;
  characteristicId?: unknown;
} = {}) => {
  const transport = new ReactNativeBleTransport({ scanTimeout: 1 }) as any;
  transport.blePlxManager = manager;
  const writeWithoutResponse = jest.fn().mockResolvedValue(undefined);
  const writeWithResponse = jest.fn().mockResolvedValue(undefined);
  const bleTransport = {
    mtuSize: 247,
    writeCharacteristic: {
      id: characteristicId,
      isWritableWithResponse: true,
      isWritableWithoutResponse: true,
      writeWithResponse,
      writeWithoutResponse,
    },
  };
  return { transport, bleTransport, writeWithoutResponse, writeWithResponse };
};

const createContext = (overrides: Record<string, unknown> = {}) => {
  const controller = new AbortController();
  return {
    controller,
    context: {
      messageName: 'FilesystemFileWrite',
      timeoutMs: 1000,
      highThroughput: true,
      generation: 3,
      signal: controller.signal,
      ...overrides,
    },
  };
};

const createGenerationGuard = () => {
  let current = true;
  return {
    assert: jest.fn(() => {
      if (!current) throw new Error('Protocol V2 monitor generation changed for dev');
    }),
    change() {
      current = false;
    },
  };
};

const frameCancellations = (manager: { cancelTransaction: jest.Mock }) =>
  manager.cancelTransaction.mock.calls.filter(([transactionId]) =>
    String(transactionId).includes(':v2frame:')
  );

afterEach(() => {
  resetProtocolV2BleTuning();
  setPlatformOS('android');
  jest.restoreAllMocks();
});

describe('Protocol V2 native frame write selection', () => {
  test('defaults the native frame write tuning on and keeps it across unrelated tuning', () => {
    expect(getProtocolV2BleTuning().nativeFrameWrite).toBe(true);
    configureProtocolV2BleTuning({ androidPacketLength: 200 });
    expect(getProtocolV2BleTuning().nativeFrameWrite).toBe(true);
    configureProtocolV2BleTuning({ nativeFrameWrite: false });
    configureProtocolV2BleTuning({ iosPacketLength: 200 });
    expect(getProtocolV2BleTuning().nativeFrameWrite).toBe(false);
  });

  test.each(['ios', 'android'] as const)(
    'writes each multi-packet high-throughput frame with one native call on %s',
    async platform => {
      setPlatformOS(platform);
      const manager = createFrameManager();
      const { transport, bleTransport, writeWithoutResponse, writeWithResponse } = createUnit({
        manager,
      });
      const { context } = createContext();
      const first = createFrame(600);
      const second = createFrame(1855);

      await transport.writeProtocolV2Frame('dev', bleTransport, first, context, jest.fn());
      await transport.writeProtocolV2Frame('dev', bleTransport, second, context, jest.fn());

      const { calls } = manager.writeCharacteristicWithoutResponseFrame.mock;
      expect(calls).toHaveLength(2);
      expect(calls[0]).toEqual([
        42,
        Buffer.from(first).toString('base64'),
        PACKET_CAPACITY,
        expect.stringMatching(FRAME_TX_PATTERN),
      ]);
      expect(calls[1]).toEqual([
        42,
        Buffer.from(second).toString('base64'),
        PACKET_CAPACITY,
        expect.stringMatching(FRAME_TX_PATTERN),
      ]);
      expect(calls[0][3]).not.toBe(calls[1][3]);
      expect(writeWithoutResponse).not.toHaveBeenCalled();
      expect(writeWithResponse).not.toHaveBeenCalled();
      expect(manager.cancelTransaction).not.toHaveBeenCalled();
      expect(transport.protocolV2FrameWrites.size).toBe(0);
    }
  );

  test.each([
    ['the JS wrapper reports no native support', () => createFrameManager({ supported: false })],
    [
      'the support check throws',
      () =>
        createFrameManager({
          supported: () => {
            throw new TypeError('native module missing');
          },
        }),
    ],
    ['ble-plx is unpatched', () => ({ cancelTransaction: jest.fn(() => Promise.resolve()) })],
    [
      'the wrapper reports support without the frame method',
      () => ({
        isWriteCharacteristicWithoutResponseFrameSupported: jest.fn(() => true),
        cancelTransaction: jest.fn(() => Promise.resolve()),
      }),
    ],
  ])('keeps the per-packet path when %s', async (_label, createManager) => {
    const manager = createManager() as {
      writeCharacteristicWithoutResponseFrame?: jest.Mock;
    };
    const { transport, bleTransport, writeWithoutResponse } = createUnit({ manager });
    const { context } = createContext();

    await expect(
      transport.writeProtocolV2Frame('dev', bleTransport, createFrame(600), context, jest.fn())
    ).resolves.toBeUndefined();

    expect(writeWithoutResponse).toHaveBeenCalledTimes(3);
    expect(manager.writeCharacteristicWithoutResponseFrame ?? jest.fn()).not.toHaveBeenCalled();
  });

  test('keeps the per-packet path when the native frame write tuning is off', async () => {
    configureProtocolV2BleTuning({ nativeFrameWrite: false });
    const manager = createFrameManager();
    const { transport, bleTransport, writeWithoutResponse } = createUnit({ manager });
    const { context } = createContext();

    await transport.writeProtocolV2Frame('dev', bleTransport, createFrame(600), context, jest.fn());

    expect(writeWithoutResponse).toHaveBeenCalledTimes(3);
    expect(manager.writeCharacteristicWithoutResponseFrame).not.toHaveBeenCalled();
  });

  test.each([
    ['a with-response write', { writeWithResponse: true }, 600, 'writeWithResponse', 3],
    ['a non-high-throughput frame', { highThroughput: false }, 600, 'writeWithoutResponse', 3],
    ['a single-packet frame', {}, PACKET_CAPACITY, 'writeWithoutResponse', 1],
  ] as const)(
    'keeps the per-packet path for %s',
    async (_label, overrides, frameLength, packetWrite, packets) => {
      const manager = createFrameManager();
      const unit = createUnit({ manager });
      const { context } = createContext(overrides);

      await unit.transport.writeProtocolV2Frame(
        'dev',
        unit.bleTransport,
        createFrame(frameLength),
        context,
        jest.fn()
      );

      expect(unit[packetWrite]).toHaveBeenCalledTimes(packets);
      expect(manager.writeCharacteristicWithoutResponseFrame).not.toHaveBeenCalled();
    }
  );

  test('keeps the per-packet path when the characteristic has no native identifier', async () => {
    const manager = createFrameManager();
    const { transport, bleTransport, writeWithoutResponse } = createUnit({
      manager,
      characteristicId: null,
    });
    const { context } = createContext();

    await transport.writeProtocolV2Frame('dev', bleTransport, createFrame(600), context, jest.fn());

    expect(writeWithoutResponse).toHaveBeenCalledTimes(3);
    expect(manager.writeCharacteristicWithoutResponseFrame).not.toHaveBeenCalled();
  });
});

describe('Protocol V2 native frame write failures', () => {
  test('cancels the frame transaction once when the call aborts', async () => {
    let rejectNative: (error: unknown) => void = () => undefined;
    const manager = createFrameManager({
      write: () =>
        new Promise<void>((_, reject) => {
          rejectNative = reject;
        }),
    });
    const { transport, bleTransport } = createUnit({ manager });
    const { controller, context } = createContext();

    const write = transport.writeProtocolV2Frame(
      'dev',
      bleTransport,
      createFrame(600),
      context,
      jest.fn()
    );
    const rejection = expect(write).rejects.toThrow(
      'Protocol V2 BLE write aborted for FilesystemFileWrite'
    );
    await flush();
    controller.abort();
    await rejection;

    const [[, , , transactionId]] = manager.writeCharacteristicWithoutResponseFrame.mock.calls;
    expect(manager.cancelTransaction).toHaveBeenCalledTimes(1);
    expect(manager.cancelTransaction).toHaveBeenCalledWith(transactionId);
    // The cancelled native write settles late; it must neither surface nor cancel again.
    rejectNative({ errorCode: 2, message: 'Operation was cancelled' });
    await transport.disconnect('dev');
    expect(frameCancellations(manager)).toHaveLength(1);
  });

  test('does not start a native frame write once the call is aborted', async () => {
    const manager = createFrameManager();
    const { transport, bleTransport } = createUnit({ manager });
    const { controller, context } = createContext();
    controller.abort();

    await expect(
      transport.writeProtocolV2Frame('dev', bleTransport, createFrame(600), context, jest.fn())
    ).rejects.toThrow('Protocol V2 BLE write aborted for FilesystemFileWrite');
    expect(manager.writeCharacteristicWithoutResponseFrame).not.toHaveBeenCalled();
    expect(manager.cancelTransaction).not.toHaveBeenCalled();
  });

  test('cancels the frame transaction once when the generation changes mid-frame', async () => {
    let resolveNative: () => void = () => undefined;
    const manager = createFrameManager({
      write: () =>
        new Promise<void>(resolve => {
          resolveNative = resolve;
        }),
    });
    const { transport, bleTransport } = createUnit({ manager });
    const { context } = createContext();
    const generation = createGenerationGuard();

    const write = transport.writeProtocolV2Frame(
      'dev',
      bleTransport,
      createFrame(600),
      context,
      generation.assert
    );
    const rejection = expect(write).rejects.toThrow('Protocol V2 monitor generation changed');
    await flush();
    generation.change();
    resolveNative();
    await rejection;

    const [[, , , transactionId]] = manager.writeCharacteristicWithoutResponseFrame.mock.calls;
    expect(manager.cancelTransaction).toHaveBeenCalledTimes(1);
    expect(manager.cancelTransaction).toHaveBeenCalledWith(transactionId);
  });

  test('cancels a frame of an invalidated link only for its own generation', async () => {
    const manager = createFrameManager({ write: () => neverSettles() });
    const { transport, bleTransport } = createUnit({ manager });
    const { context } = createContext();

    const write = transport.writeProtocolV2Frame(
      'dev',
      bleTransport,
      createFrame(600),
      context,
      jest.fn()
    );
    const rejection = expect(write).rejects.toThrow('link reset');
    await flush();
    transport.cancelProtocolV2FrameWrite('dev', new Error('older link reset'), 2);
    expect(manager.cancelTransaction).not.toHaveBeenCalled();
    transport.cancelProtocolV2FrameWrite('dev', new Error('link reset'), 3);
    await rejection;
    expect(manager.cancelTransaction).toHaveBeenCalledTimes(1);
  });

  test('cancels the in-flight frame before a BLE manager reset destroys the manager', async () => {
    const manager = createFrameManager({ write: () => neverSettles() });
    const { transport, bleTransport } = createUnit({ manager });
    const { context } = createContext();

    const write = transport.writeProtocolV2Frame(
      'dev',
      bleTransport,
      createFrame(600),
      context,
      jest.fn()
    );
    const rejection = expect(write).rejects.toThrow('React Native BLE manager reset');
    await flush();
    transport.resetPlxManager();
    await rejection;

    expect(manager.cancelTransaction).toHaveBeenCalledTimes(1);
    expect(manager.destroy).toHaveBeenCalledTimes(1);
    expect(manager.cancelTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      manager.destroy.mock.invocationCallOrder[0]
    );
    await flush();
  });

  test('does not retry a native frame that fails with congestion', async () => {
    const manager = createFrameManager({
      write: () => Promise.reject(Object.assign(new Error('GATT_CONGESTED'), { status: 143 })),
    });
    const { transport, bleTransport, writeWithoutResponse } = createUnit({ manager });
    const { context } = createContext();

    await expect(
      transport.writeProtocolV2Frame('dev', bleTransport, createFrame(600), context, jest.fn())
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.BleWriteCharacteristicError });

    expect(manager.writeCharacteristicWithoutResponseFrame).toHaveBeenCalledTimes(1);
    expect(writeWithoutResponse).not.toHaveBeenCalled();
    expect(manager.cancelTransaction).not.toHaveBeenCalled();
  });

  test('maps a synchronous native failure to a link-fatal write error', async () => {
    const manager = createFrameManager({
      write: () => {
        throw new TypeError('native method missing');
      },
    });
    const { transport, bleTransport } = createUnit({ manager });
    const { context } = createContext();

    await expect(
      transport.writeProtocolV2Frame('dev', bleTransport, createFrame(600), context, jest.fn())
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.BleWriteCharacteristicError });
    expect(transport.protocolV2FrameWrites.size).toBe(0);
  });

  test.each([
    ['ble-plx', { errorCode: 201, reason: 'Device dev was disconnected' }],
    ['CoreBluetooth', { errorCode: 0, iosErrorCode: 7, message: 'Peripheral disconnected' }],
  ])('maps a %s native disconnect to the BLE disconnect error', async (_label, nativeError) => {
    const manager = createFrameManager({ write: () => Promise.reject(nativeError) });
    const { transport, bleTransport } = createUnit({ manager });
    const { context } = createContext();

    await expect(
      transport.writeProtocolV2Frame('dev', bleTransport, createFrame(600), context, jest.fn())
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.BleDeviceDisconnected });
    expect(manager.writeCharacteristicWithoutResponseFrame).toHaveBeenCalledTimes(1);
  });

  describe('watchdog', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['setImmediate', 'performance'] });
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    test('cancels a wedged frame once and tears the link down', async () => {
      const manager = createFrameManager({ write: () => neverSettles() });
      const { transport, bleTransport } = createUnit({ manager });
      const disconnect = jest.spyOn(transport, 'disconnect').mockResolvedValue(undefined);
      const { context } = createContext();

      const write = transport.writeProtocolV2Frame(
        'dev',
        bleTransport,
        createFrame(600),
        context,
        jest.fn()
      );
      const rejection = expect(write).rejects.toMatchObject({
        errorCode: HardwareErrorCode.BleWriteCharacteristicError,
        message: `BLE write timeout after ${BLE_WRITE_PACKET_TIMEOUT_MS}ms`,
      });
      jest.advanceTimersByTime(BLE_WRITE_PACKET_TIMEOUT_MS - 1);
      expect(manager.cancelTransaction).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      await rejection;

      const [[, , , transactionId]] = manager.writeCharacteristicWithoutResponseFrame.mock.calls;
      expect(manager.cancelTransaction).toHaveBeenCalledTimes(1);
      expect(manager.cancelTransaction).toHaveBeenCalledWith(transactionId);
      expect(disconnect).toHaveBeenCalledTimes(1);
      expect(disconnect).toHaveBeenCalledWith('dev');
    });

    test('cancels a superseded wedged frame without tearing down the current link', async () => {
      const manager = createFrameManager({ write: () => neverSettles() });
      const { transport, bleTransport } = createUnit({ manager });
      const disconnect = jest.spyOn(transport, 'disconnect').mockResolvedValue(undefined);
      const { context } = createContext();
      const generation = createGenerationGuard();

      const write = transport.writeProtocolV2Frame(
        'dev',
        bleTransport,
        createFrame(600),
        context,
        generation.assert
      );
      const rejection = expect(write).rejects.toMatchObject({
        errorCode: HardwareErrorCode.BleWriteCharacteristicError,
      });
      generation.change();
      jest.advanceTimersByTime(BLE_WRITE_PACKET_TIMEOUT_MS);
      await rejection;

      expect(manager.cancelTransaction).toHaveBeenCalledTimes(1);
      expect(disconnect).not.toHaveBeenCalled();
    });
  });
});

describe('Protocol V1 never uses the native frame write', () => {
  test('keeps Protocol V1 writes on the per-packet path', async () => {
    const uuid = 'v1-device';
    const transport = new ReactNativeBleTransport({ scanTimeout: 1 }) as any;
    transport.configure(protocolV1SchemaFixture);
    transport.deviceProtocol.set(uuid, 'V1');
    const manager = createFrameManager();
    transport.blePlxManager = manager;
    const writeWithoutResponse = jest.fn(() => Promise.resolve());
    const writeWithRetry = jest.fn(() => Promise.resolve());
    transport.getCachedTransport = () => ({
      mtuSize: 247,
      writeCharacteristic: {
        id: 42,
        isWritableWithResponse: false,
        isWritableWithoutResponse: true,
        writeWithResponse: jest.fn(),
        writeWithoutResponse,
      },
      writeWithRetry,
    });
    jest.spyOn(transport, 'disconnect').mockResolvedValue(undefined);

    await expect(
      transport.call(uuid, 'FirmwareUpload', { payload: new Uint8Array(2000) }, { timeoutMs: 50 })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.BleTimeoutError });
    await expect(transport.call(uuid, 'Initialize', {}, { timeoutMs: 50 })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleTimeoutError,
    });

    expect(writeWithRetry.mock.calls.length).toBeGreaterThan(1);
    expect(writeWithoutResponse).toHaveBeenCalled();
    expect(manager.writeCharacteristicWithoutResponseFrame).not.toHaveBeenCalled();
    expect(manager.isWriteCharacteristicWithoutResponseFrameSupported).not.toHaveBeenCalled();
  });
});

const protocolV1Schema = {
  nested: {
    Initialize: { fields: {} },
    GetFeatures: { fields: {} },
    Success: { fields: { message: { type: 'string', id: 1 } } },
    Failure: { fields: { code: { type: 'uint32', id: 1 }, message: { type: 'string', id: 2 } } },
    MessageType: {
      values: {
        MessageType_Initialize: 0,
        MessageType_Success: 2,
        MessageType_Failure: 3,
        MessageType_GetFeatures: 55,
      },
    },
  },
};

const protocolV2Schema = {
  nested: {
    Ping: { fields: { message: { type: 'string', id: 1 } } },
    Success: { fields: { message: { type: 'string', id: 1 } } },
    Failure: {
      fields: {
        code: { type: 'uint32', id: 1 },
        subcode: { type: 'uint32', id: 2 },
        message: { type: 'string', id: 3 },
      },
    },
    FilesystemFile: {
      fields: {
        path: { type: 'string', id: 1 },
        offset: { type: 'uint32', id: 2 },
        total_size: { type: 'uint32', id: 3 },
        data: { type: 'bytes', id: 4 },
        processed_byte: { type: 'uint32', id: 6 },
      },
    },
    FilesystemFileWrite: {
      fields: {
        file: { type: 'FilesystemFile', id: 1 },
        overwrite: { type: 'bool', id: 2 },
        append: { type: 'bool', id: 3 },
      },
    },
    MessageType: {
      values: {
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
        MessageType_Failure: 60208,
        MessageType_FilesystemFile: 60803,
        MessageType_FilesystemFileWrite: 60805,
      },
    },
  },
};

const schemas = {
  protocolV1: parseConfigure(protocolV1Schema),
  protocolV2: parseConfigure(protocolV2Schema),
};

const FILE_PATH = 'vol0:/test-app.bin';
const CHUNK_BYTES = 1800;

const fileChunks = (totalSize: number) => {
  const chunks: Record<string, unknown>[] = [];
  for (let offset = 0; offset < totalSize; offset += CHUNK_BYTES) {
    chunks.push({
      file: {
        path: FILE_PATH,
        offset,
        total_size: totalSize,
        data: new Uint8Array(Math.min(CHUNK_BYTES, totalSize - offset)),
      },
      overwrite: offset === 0,
      append: false,
    });
  }
  return chunks;
};

/** A Pro2-like peripheral that reassembles written frames and answers Ping and file writes. */
const createLinkHarness = ({
  nativeFrameSupported,
  holdFileWrites = false,
}: {
  nativeFrameSupported: boolean;
  holdFileWrites?: boolean;
}) => {
  const uuid = 'dev';
  const assembler = new ProtocolV2FrameAssembler(PROTOCOL_V2_BLE_FRAME_MAX_BYTES);
  const writtenFrames: number[] = [];
  let responseSeq = 0;
  let notifyCallback:
    | ((error: Error | null, characteristic: { value: string } | null) => void)
    | undefined;
  const respond = (name: string, message: Record<string, unknown>) => {
    responseSeq += 1;
    const response = ProtocolV2.encodeFrame(schemas, name, message, {
      router: PROTOCOL_V2_CHANNEL_BLE_UART,
      seq: responseSeq,
    });
    notifyCallback?.(null, { value: Buffer.from(response).toString('base64') });
  };
  const receive = (bytes: Uint8Array) => {
    for (const frame of assembler.drain(bytes)) {
      writtenFrames.push(frame.length);
      const decoded = ProtocolV2.decodeFrame(schemas, frame);
      if (decoded.type === 'Ping') {
        respond('Success', { message: 'ok' });
      } else if (decoded.type === 'FilesystemFileWrite') {
        const { file } = decoded.message as {
          file: { path: string; offset: number; total_size: number; data: string };
        };
        // Decoded protobuf bytes are hex strings.
        respond('FilesystemFile', {
          path: file.path,
          offset: file.offset,
          total_size: file.total_size,
          processed_byte: Number(file.offset) + file.data.length / 2,
        });
      }
    }
  };
  const packetWrite = jest.fn((base64: string) => {
    receive(new Uint8Array(Buffer.from(base64, 'base64')));
    return Promise.resolve();
  });
  const writeCharacteristic = {
    id: 42,
    uuid: '0002',
    deviceID: uuid,
    isWritableWithResponse: true,
    isWritableWithoutResponse: true,
    writeWithResponse: packetWrite,
    writeWithoutResponse: packetWrite,
  };
  const notifyCharacteristic = {
    id: 43,
    uuid: '0003',
    deviceID: uuid,
    isNotifiable: true,
    monitor: jest.fn(callback => {
      notifyCallback = callback;
      return { remove: jest.fn() };
    }),
  };
  const device = {
    id: uuid,
    name: 'OneKey Pro 2',
    localName: 'OneKey Pro 2',
    mtu: 247,
    serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
    isConnected: jest.fn(() => Promise.resolve(true)),
    cancelConnection: jest.fn(() => Promise.resolve()),
    connect: jest.fn(),
    onDisconnected: jest.fn(() => ({ remove: jest.fn() })),
    requestMTU: jest.fn(),
    requestConnectionPriority: jest.fn(),
  };
  device.connect.mockResolvedValue(device);
  device.requestMTU.mockResolvedValue(device);
  device.requestConnectionPriority.mockResolvedValue(device);
  const bleManager = {
    devices: jest.fn(() => Promise.resolve([device])),
    connectedDevices: jest.fn(() => Promise.resolve([])),
    cancelTransaction: jest.fn(() => Promise.resolve()),
    cancelDeviceConnection: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(),
    isWriteCharacteristicWithoutResponseFrameSupported: jest.fn(() => nativeFrameSupported),
    writeCharacteristicWithoutResponseFrame: jest.fn(
      (_id: number, base64Frame: string, _packetSize: number, _transactionId: string) => {
        if (holdFileWrites) return neverSettles();
        receive(new Uint8Array(Buffer.from(base64Frame, 'base64')));
        return Promise.resolve();
      }
    ),
  };
  const transport = new ReactNativeBleTransport({ scanTimeout: 1 }) as any;
  const logger = { debug: jest.fn(), error: jest.fn() };
  transport.blePlxManager = bleManager;
  transport.resolveCharacteristics = jest.fn(() =>
    Promise.resolve({ writeCharacteristic, notifyCharacteristic })
  );
  transport.init(logger, new EventEmitter());
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);

  const writeFile = (totalSize: number, timeoutMs = 5000) => {
    const [first, ...rest] = fileChunks(totalSize);
    const confirmations: unknown[] = [];
    const call = transport.call(uuid, 'FilesystemFileWrite', first, {
      timeoutMs,
      fileWritePipeline: {
        next: () => Promise.resolve(rest.shift()),
        onResponse: (response: unknown) => confirmations.push(response),
      },
    }) as Promise<{ type: string }>;
    return { call, confirmations };
  };

  const logs = (message: string) =>
    logger.debug.mock.calls
      .filter(([logMessage]) => logMessage === message)
      .map(([, params]) => params as Record<string, unknown>);

  return { transport, uuid, bleManager, packetWrite, writtenFrames, writeFile, logs };
};

const expectScalarOnly = (value: unknown) => {
  if (Array.isArray(value)) {
    value.forEach(item => expect(typeof item).toBe('number'));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(item => expectScalarOnly(item));
    return;
  }
  expect(['number', 'string', 'boolean']).toContain(typeof value);
};

describe('Protocol V2 FileWrite perf summary', () => {
  test.each([
    ['ios', true, 'native-frame'],
    ['android', true, 'native-frame'],
    ['ios', false, 'per-packet'],
    ['android', false, 'per-packet'],
  ] as const)(
    'logs one scalar summary per pipelined file write on %s (native support %s)',
    async (platform, nativeFrameSupported, mode) => {
      setPlatformOS(platform);
      const harness = createLinkHarness({ nativeFrameSupported });
      const { transport, uuid, bleManager, packetWrite, writtenFrames } = harness;
      await transport.acquire({ uuid, expectedProtocol: 'V2' });
      const probeFrames = writtenFrames.length;
      const probePacketWrites = packetWrite.mock.calls.length;

      try {
        const totalSize = 3 * CHUNK_BYTES + 500;
        const { call, confirmations } = harness.writeFile(totalSize);
        await expect(call).resolves.toMatchObject({ type: 'FilesystemFile' });
        expect(confirmations).toHaveLength(4);
        // A second pipelined write on the same link still logs its own summary.
        await expect(harness.writeFile(2 * CHUNK_BYTES).call).resolves.toMatchObject({
          type: 'FilesystemFile',
        });

        const fileFrames = writtenFrames.slice(probeFrames, probeFrames + 4);
        const expectedPackets = fileFrames.reduce(
          (sum, length) => sum + Math.ceil(length / PACKET_CAPACITY),
          0
        );
        const summaries = harness.logs(PERF_MESSAGE);
        expect(summaries).toHaveLength(2);
        const [summary] = summaries;
        expect(Object.keys(summary).sort()).toEqual(
          [
            'platform',
            'mode',
            'ok',
            'frames',
            'packets',
            'frameBytes',
            'elapsedMs',
            'writeMs',
            'readWaitMs',
            ...(mode === 'per-packet' ? ['packetMs'] : []),
          ].sort()
        );
        expect(summary).toMatchObject({
          platform,
          mode,
          ok: true,
          frames: 4,
          packets: expectedPackets,
          frameBytes: fileFrames.reduce((sum, length) => sum + length, 0),
        });
        expect(Object.keys(summary.writeMs as object).sort()).toEqual(['avg', 'max', 'total']);
        expect(Object.keys(summary.readWaitMs as object).sort()).toEqual(['avg', 'max', 'total']);
        if (mode === 'per-packet') {
          const packetMs = summary.packetMs as { hist: number[] };
          expect(Object.keys(packetMs).sort()).toEqual(['avg', 'hist', 'max']);
          expect(packetMs.hist).toHaveLength(6);
          expect(packetMs.hist.reduce((sum, count) => sum + count, 0)).toBe(expectedPackets);
          expect(bleManager.writeCharacteristicWithoutResponseFrame).not.toHaveBeenCalled();
        } else {
          expect(bleManager.writeCharacteristicWithoutResponseFrame).toHaveBeenCalledTimes(6);
          expect(packetWrite).toHaveBeenCalledTimes(probePacketWrites);
        }
        summaries.forEach(item => expectScalarOnly(item));
        expect(JSON.stringify(summaries)).not.toContain(FILE_PATH);
        expect(JSON.stringify(summaries)).not.toContain(uuid);

        const modeLogs = harness.logs(MODE_MESSAGE);
        expect(modeLogs).toHaveLength(1);
        expect(modeLogs[0]).toMatchObject({ platform, mode });
      } finally {
        await transport.release(uuid, true);
      }
    }
  );

  test('does not log a perf summary for writes outside the file write pipeline', async () => {
    const harness = createLinkHarness({ nativeFrameSupported: true });
    const { transport, uuid } = harness;
    await transport.acquire({ uuid, expectedProtocol: 'V2' });

    try {
      const [chunk] = fileChunks(CHUNK_BYTES);
      await expect(
        transport.call(uuid, 'FilesystemFileWrite', chunk, { timeoutMs: 5000 })
      ).resolves.toMatchObject({ type: 'FilesystemFile' });
      await transport.call(uuid, 'Ping', { message: 'control' }, { timeoutMs: 5000 });

      expect(harness.logs(PERF_MESSAGE)).toHaveLength(0);
      expect(harness.bleManager.writeCharacteristicWithoutResponseFrame).toHaveBeenCalledTimes(1);
    } finally {
      await transport.release(uuid, true);
    }
  });

  test('cancels the in-flight frame once when the link is released and logs a failed summary', async () => {
    const harness = createLinkHarness({ nativeFrameSupported: true, holdFileWrites: true });
    const { transport, uuid, bleManager } = harness;
    await transport.acquire({ uuid, expectedProtocol: 'V2' });

    const { call } = harness.writeFile(3 * CHUNK_BYTES);
    const rejection = expect(call).rejects.toThrow('React Native BLE transport released');
    // Bounded so a regression fails this test instead of keeping the jest worker alive.
    for (
      let attempt = 0;
      attempt < 50 && bleManager.writeCharacteristicWithoutResponseFrame.mock.calls.length < 1;
      attempt += 1
    ) {
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
    expect(bleManager.writeCharacteristicWithoutResponseFrame).toHaveBeenCalledTimes(1);
    await transport.release(uuid, true);
    await rejection;

    const [[, , , transactionId]] = bleManager.writeCharacteristicWithoutResponseFrame.mock.calls;
    expect(transactionId).toMatch(new RegExp(`^${uuid}:v2frame:\\d+:\\d+$`));
    expect(frameCancellations(bleManager)).toEqual([[transactionId]]);
    expect(bleManager.writeCharacteristicWithoutResponseFrame).toHaveBeenCalledTimes(1);
    const summaries = harness.logs(PERF_MESSAGE);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({ mode: 'native-frame', ok: false, frames: 0 });
  });
});
