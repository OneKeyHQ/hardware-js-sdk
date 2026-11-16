import { EventEmitter } from 'events';
import { Buffer } from 'buffer';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import transportPackage, {
  PROTOCOL_V2_CHANNEL_USB,
  ProtocolV2,
  TRANSPORT_EVENT,
} from '@onekeyfe/hd-transport';

import ReactNativeUsbTransport from '..';
import { ONEKEY_USB_DEVICE_DETACHED, mapNativeUsbError } from '../nativeModule';

const mockNativeEmitter = new EventEmitter();

const DEVICE_PATH = '/dev/bus/usb/001/002';

type NativeDevice = {
  path: string;
  vendorId: number;
  productId: number;
  serialNumber?: string | null;
};

const mockNativeState: {
  available: boolean;
  os: string;
  devices: NativeDevice[];
  permission: Map<string, boolean>;
  open: Set<string>;
  inQueue: string[];
  lastOut: string[];
  closed: string[];
  cancelled: string[];
  cancelPendingOnNextTransfer: boolean;
  transferInCalls: Array<{ path: string; length: number; timeoutMs: number }>;
  transferInError?: Error;
  transferInDelayMs?: number;
  onRequestPermission?: (path: string) => boolean;
  onTransferOut?: (data: string) => void;
  onTransferInStart?: () => void;
} = {
  available: true,
  os: 'android',
  devices: [],
  permission: new Map(),
  open: new Set(),
  inQueue: [],
  lastOut: [],
  closed: [],
  cancelled: [],
  cancelPendingOnNextTransfer: false,
  transferInCalls: [],
};

jest.mock(
  'react-native',
  () => ({
    Platform: {
      get OS() {
        return mockNativeState.os;
      },
    },
    NativeModules: {
      get OneKeyUsb() {
        if (!mockNativeState.available) {
          return undefined;
        }
        return {
          getDevices: jest.fn(() =>
            Promise.resolve(
              mockNativeState.devices.map(device => ({
                ...device,
                serialNumber:
                  mockNativeState.permission.get(device.path) === true
                    ? device.serialNumber ?? null
                    : null,
              }))
            )
          ),
          hasPermission: jest.fn((path: string) =>
            Promise.resolve(mockNativeState.permission.get(path) === true)
          ),
          requestPermission: jest.fn((path: string) => {
            if (mockNativeState.onRequestPermission) {
              return Promise.resolve(mockNativeState.onRequestPermission(path));
            }
            return Promise.resolve(mockNativeState.permission.get(path) === true);
          }),
          open: jest.fn((path: string) => {
            if (mockNativeState.permission.get(path) !== true) {
              const error = new Error('USB permission denied');
              (error as { code?: string }).code = 'USB_PERMISSION';
              return Promise.reject(error);
            }
            mockNativeState.open.add(path);
            return Promise.resolve();
          }),
          close: jest.fn((path: string) => {
            mockNativeState.open.delete(path);
            mockNativeState.closed.push(path);
            return Promise.resolve();
          }),
          transferOut: jest.fn((_path: string, data: string) => {
            mockNativeState.lastOut.push(data);
            mockNativeState.onTransferOut?.(data);
            return Promise.resolve();
          }),
          transferIn: jest.fn(async (path: string, length: number, timeoutMs: number) => {
            mockNativeState.transferInCalls.push({ path, length, timeoutMs });
            mockNativeState.onTransferInStart?.();
            if (mockNativeState.cancelPendingOnNextTransfer) {
              mockNativeState.cancelPendingOnNextTransfer = false;
              const error = new Error('USB transfer cancelled');
              (error as { code?: string }).code = 'USB_CANCELLED';
              throw error;
            }
            if (mockNativeState.transferInError) {
              throw mockNativeState.transferInError;
            }
            if (mockNativeState.transferInDelayMs) {
              await new Promise(resolve => {
                setTimeout(resolve, mockNativeState.transferInDelayMs);
              });
            }
            const next = mockNativeState.inQueue.shift();
            if (!next) {
              const error = new Error('USB transfer timeout');
              (error as { code?: string }).code = 'USB_TIMEOUT';
              throw error;
            }
            return next;
          }),
          cancel: jest.fn((path: string) => {
            mockNativeState.cancelled.push(path);
            return Promise.resolve();
          }),
        };
      },
    },
    NativeEventEmitter: class {
      addListener(event: string, handler: (payload: unknown) => void) {
        mockNativeEmitter.on(event, handler);
        return {
          remove: () => mockNativeEmitter.off(event, handler),
        };
      }
    },
  }),
  { virtual: true }
);

const { parseConfigure, ProtocolV1 } = transportPackage;

const protocolV1Schema = {
  nested: {
    Initialize: { fields: {} },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
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
        message: { type: 'string', id: 1 },
      },
    },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
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

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function v1SuccessPacket(): string {
  const chunks = ProtocolV1.encodeTransportPackets(schemas.protocolV1, 'Success', {
    message: 'ok',
  });
  const buffer = chunks[0].toBuffer();
  return toBase64(Uint8Array.from(Buffer.from(buffer as unknown as ArrayBuffer)));
}

function createTransport() {
  const transport = new ReactNativeUsbTransport();
  transport.init({ debug: jest.fn(), error: jest.fn() }, new EventEmitter());
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);
  return transport;
}

describe('ReactNativeUsbTransport', () => {
  beforeEach(() => {
    mockNativeState.available = true;
    mockNativeState.os = 'android';
    mockNativeState.devices = [
      {
        path: DEVICE_PATH,
        vendorId: 0x1209,
        productId: 0x53c1,
        serialNumber: 'SN123',
      },
    ];
    mockNativeState.permission = new Map([[DEVICE_PATH, true]]);
    mockNativeState.open = new Set();
    mockNativeState.inQueue = [];
    mockNativeState.lastOut = [];
    mockNativeState.closed = [];
    mockNativeState.cancelled = [];
    mockNativeState.cancelPendingOnNextTransfer = false;
    mockNativeState.transferInCalls = [];
    mockNativeState.transferInError = undefined;
    mockNativeState.transferInDelayMs = undefined;
    mockNativeState.onRequestPermission = undefined;
    mockNativeState.onTransferOut = undefined;
    mockNativeState.onTransferInStart = undefined;
    mockNativeEmitter.removeAllListeners();
  });

  test('enumerate filters OneKey devices and uses Android deviceName as path', async () => {
    mockNativeState.devices.push({
      path: '/dev/bus/usb/001/099',
      vendorId: 0x1234,
      productId: 0x5678,
      serialNumber: 'other',
    });
    const transport = createTransport();
    await expect(transport.enumerate()).resolves.toEqual([
      expect.objectContaining({ path: DEVICE_PATH, id: DEVICE_PATH, commType: 'usb' }),
    ]);
  });

  test('deviceName path remains stable across permission grant and acquire', async () => {
    mockNativeState.permission = new Map([[DEVICE_PATH, false]]);
    mockNativeState.onRequestPermission = path => {
      mockNativeState.permission.set(path, true);
      return true;
    };
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };

    const transport = createTransport();
    const beforeAcquire = await transport.enumerate();
    expect(beforeAcquire).toEqual([
      expect.objectContaining({ path: DEVICE_PATH, id: DEVICE_PATH }),
    ]);

    const acquiredPath = await transport.acquire({ path: DEVICE_PATH, expectedProtocol: 'V1' });
    expect(acquiredPath).toBe(DEVICE_PATH);

    const afterAcquire = await transport.enumerate();
    expect(afterAcquire).toEqual([expect.objectContaining({ path: DEVICE_PATH, id: DEVICE_PATH })]);
  });

  test('missing native module returns no devices', async () => {
    mockNativeState.available = false;
    mockNativeState.os = 'ios';
    const transport = createTransport();
    await expect(transport.enumerate()).resolves.toEqual([]);
  });

  test('permission denied returns a typed access error', async () => {
    mockNativeState.permission = new Map([[DEVICE_PATH, false]]);
    const transport = createTransport();
    await expect(transport.acquire({ path: DEVICE_PATH })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.WebUsbDeviceAccessError,
    });
  });

  test('Protocol V1 call uses 64-byte packets with report id', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    await transport.acquire({ path: DEVICE_PATH, expectedProtocol: 'V1' });
    mockNativeState.lastOut = [];
    const result = await transport.call(DEVICE_PATH, 'Initialize', {});
    expect(result.type).toBe('Success');
    const first = Buffer.from(mockNativeState.lastOut[0], 'base64');
    expect(first.length).toBe(64);
    expect(first[0]).toBe(0x3f);
  });

  test('Protocol V2 probe and call round trip', async () => {
    let seq = 0;
    mockNativeState.onTransferOut = () => {
      seq += 1;
      mockNativeState.inQueue.push(
        toBase64(
          ProtocolV2.encodeFrame(
            schemas,
            'Success',
            { message: seq === 1 ? 'ok' : 'pong' },
            { router: PROTOCOL_V2_CHANNEL_USB, seq }
          )
        )
      );
    };
    const transport = createTransport();
    await transport.acquire({ path: DEVICE_PATH, expectedProtocol: 'V2' });
    expect(transport.getProtocolType(DEVICE_PATH)).toBe('V2');
    const result = await transport.call(DEVICE_PATH, 'Ping', { message: 'hi' });
    expect(result.type).toBe('Success');
  });

  test('detach after init() (without listen()) emits DEVICE_DISCONNECT and cleans state, and stop() unsubscribes', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    const disconnected = jest.fn();
    transport.emitter?.on(TRANSPORT_EVENT.DEVICE_DISCONNECT, disconnected);

    // Calling init/listen again must be idempotent (clear previous subscriptions first).
    await transport.init({ debug: jest.fn(), error: jest.fn() }, transport.emitter);
    transport.listen();

    await transport.acquire({ path: DEVICE_PATH, expectedProtocol: 'V1' });
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      path: DEVICE_PATH,
      vendorId: 0x1209,
      productId: 0x53c1,
      serialNumber: 'SN123',
    });
    await new Promise(resolve => {
      setImmediate(resolve);
    });
    expect(disconnected).toHaveBeenCalledTimes(1);
    expect(disconnected).toHaveBeenCalledWith(
      expect.objectContaining({ id: DEVICE_PATH, connectId: DEVICE_PATH })
    );
    expect(transport.getProtocolType(DEVICE_PATH)).toBeUndefined();
    await expect(transport.call(DEVICE_PATH, 'Initialize', {})).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotFound,
    });

    await transport.stop();
    disconnected.mockClear();
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      path: DEVICE_PATH,
      vendorId: 0x1209,
      productId: 0x53c1,
      serialNumber: 'SN123',
    });
    await new Promise(resolve => {
      setImmediate(resolve);
    });
    expect(disconnected).not.toHaveBeenCalled();
  });

  test('Protocol V2 read retries USB timeouts while waiting for user confirmation and cancel stops the loop', async () => {
    let seq = 0;
    let delayedTimeoutOnce: (() => void) | undefined;
    mockNativeState.onTransferOut = () => {
      seq += 1;
      if (seq === 1) {
        mockNativeState.inQueue.push(
          toBase64(
            ProtocolV2.encodeFrame(
              schemas,
              'Success',
              { message: 'ok' },
              { router: PROTOCOL_V2_CHANNEL_USB, seq }
            )
          )
        );
      } else if (seq === 2) {
        // Two USB IN timeouts while user is confirming, followed by the real V2 response.
        mockNativeState.transferInError = Object.assign(new Error('USB transfer timeout'), {
          code: 'USB_TIMEOUT',
        });
        let timeoutCount = 0;
        mockNativeState.onTransferInStart = () => {
          timeoutCount += 1;
          if (timeoutCount >= 3) {
            mockNativeState.transferInError = undefined;
            mockNativeState.onTransferInStart = undefined;
            mockNativeState.inQueue.push(
              toBase64(
                ProtocolV2.encodeFrame(
                  schemas,
                  'Success',
                  { message: 'confirmed' },
                  { router: PROTOCOL_V2_CHANNEL_USB, seq }
                )
              )
            );
          }
        };
      }
    };
    const transport = createTransport();
    await transport.acquire({ path: DEVICE_PATH, expectedProtocol: 'V2' });

    mockNativeState.transferInCalls = [];
    const confirmed = await transport.call(DEVICE_PATH, 'Ping', { message: 'confirm' });
    expect(confirmed).toMatchObject({ type: 'Success', message: { message: 'confirmed' } });
    expect(mockNativeState.transferInCalls).toHaveLength(3);
    expect(transport.getProtocolType(DEVICE_PATH)).toBe('V2');

    // Now simulate indefinite timeouts interrupted by transport.cancel().
    mockNativeState.transferInCalls = [];
    mockNativeState.transferInError = Object.assign(new Error('USB transfer timeout'), {
      code: 'USB_TIMEOUT',
    });
    const waitForIn = new Promise<void>(resolve => {
      delayedTimeoutOnce = resolve;
    });
    mockNativeState.onTransferInStart = () => {
      delayedTimeoutOnce?.();
      delayedTimeoutOnce = undefined;
    };
    const pendingCall = transport.call(DEVICE_PATH, 'Ping', { message: 'wait' });
    await waitForIn;
    transport.cancel();
    await expect(pendingCall).rejects.toThrow(/cancelled/i);
  });

  test('Protocol V2 real transfer error is link-fatal', async () => {
    let seq = 0;
    mockNativeState.onTransferOut = () => {
      seq += 1;
      if (seq === 1) {
        mockNativeState.inQueue.push(
          toBase64(
            ProtocolV2.encodeFrame(
              schemas,
              'Success',
              { message: 'ok' },
              { router: PROTOCOL_V2_CHANNEL_USB, seq }
            )
          )
        );
      }
    };
    const transport = createTransport();
    await transport.acquire({ path: DEVICE_PATH, expectedProtocol: 'V2' });
    mockNativeState.closed = [];
    mockNativeState.transferInError = Object.assign(new Error('USB transfer failed'), {
      code: 'USB_TRANSFER_FAILED',
    });

    await expect(transport.call(DEVICE_PATH, 'Ping', { message: 'fail' })).rejects.toThrow(
      /transfer failed/i
    );
    expect(transport.getProtocolType(DEVICE_PATH)).toBeUndefined();
    expect(mockNativeState.closed).toContain(DEVICE_PATH);
  });

  test('mapNativeUsbError and V1 retries classify native USB error codes accurately', async () => {
    expect(() =>
      mapNativeUsbError(
        Object.assign(new Error('USB transfer cancelled'), { code: 'USB_CANCELLED' })
      )
    ).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.DeviceInterruptedFromOutside })
    );
    expect(() =>
      mapNativeUsbError(
        Object.assign(new Error('USB device disconnected'), { code: 'USB_NOT_FOUND' })
      )
    ).toThrow(expect.objectContaining({ errorCode: HardwareErrorCode.DeviceNotFound }));
    expect(() =>
      mapNativeUsbError(
        Object.assign(new Error('USB transfer failed'), { code: 'USB_TRANSFER_FAILED' })
      )
    ).toThrow(expect.objectContaining({ errorCode: HardwareErrorCode.NetworkError }));

    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    await transport.acquire({ path: DEVICE_PATH, expectedProtocol: 'V1' });

    mockNativeState.transferInCalls = [];
    mockNativeState.transferInError = Object.assign(new Error('USB device disconnected'), {
      code: 'USB_NOT_FOUND',
    });
    await expect(transport.call(DEVICE_PATH, 'Initialize', {})).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotFound,
    });
    const v1ReadCalls = mockNativeState.transferInCalls.filter(c => c.timeoutMs === 30000);
    expect(v1ReadCalls).toHaveLength(1);
  });

  test('cancel is one-shot so subsequent call on the same open handle succeeds', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    await transport.acquire({ path: DEVICE_PATH, expectedProtocol: 'V1' });

    mockNativeState.cancelPendingOnNextTransfer = true;
    const transferInStarted = new Promise<void>(resolve => {
      mockNativeState.onTransferInStart = () => {
        mockNativeState.onTransferInStart = undefined;
        resolve();
      };
    });
    const inflight = transport.call(DEVICE_PATH, 'Initialize', {});
    await transferInStarted;
    transport.cancel();
    await expect(inflight).rejects.toThrow(/cancelled/i);
    expect(mockNativeState.cancelled).toContain(DEVICE_PATH);
    expect(mockNativeState.open.has(DEVICE_PATH)).toBe(true);

    mockNativeState.inQueue = [];
    const nextResult = await transport.call(DEVICE_PATH, 'Initialize', {});
    expect(nextResult.type).toBe('Success');
  });

  test('empty USB transfer retries are bounded by PACKET_IO_MAX_RETRIES', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    await transport.acquire({ path: DEVICE_PATH, expectedProtocol: 'V1' });

    mockNativeState.transferInCalls = [];
    mockNativeState.transferInError = Object.assign(new Error('Empty USB transfer'), {
      code: 'USB_TRANSFER_IN',
    });

    await expect(transport.call(DEVICE_PATH, 'Initialize', {})).rejects.toThrow(
      /Empty USB transfer/i
    );
    const retryCalls = mockNativeState.transferInCalls.filter(call => call.timeoutMs === 30000);
    expect(retryCalls).toHaveLength(3);
  });

  test('cancel and release close the native handle', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    await transport.acquire({ path: DEVICE_PATH, expectedProtocol: 'V1' });
    transport.cancel();
    await transport.release(DEVICE_PATH);
    expect(mockNativeState.cancelled).toContain(DEVICE_PATH);
    expect(mockNativeState.closed).toContain(DEVICE_PATH);
  });
});
