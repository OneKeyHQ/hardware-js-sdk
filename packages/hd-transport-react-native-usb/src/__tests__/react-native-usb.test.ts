import { EventEmitter } from 'events';
import { Buffer } from 'buffer';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import transportPackage, {
  PROTOCOL_V2_CHANNEL_USB,
  ProtocolV2,
  TRANSPORT_EVENT,
} from '@onekeyfe/hd-transport';

import ReactNativeUsbTransport from '..';
import {
  ONEKEY_USB_DEVICE_ATTACHED,
  ONEKEY_USB_DEVICE_DETACHED,
  mapNativeUsbError,
} from '../nativeModule';

import type { ReactNativeUsbTransportOptions } from '..';

const mockNativeEmitter = new EventEmitter();

const DEVICE_HANDLE = '/dev/bus/usb/001/002';
const REPLUG_HANDLE = '/dev/bus/usb/001/003';
const DEVICE_SERIAL = 'SN123';

type NativeDevice = {
  handle: string;
  vendorId: number;
  productId: number;
  productName?: string | null;
  manufacturerName?: string | null;
  serialNumber?: string | null;
};

const mockNativeState: {
  available: boolean;
  os: string;
  devices: NativeDevice[];
  permission: Map<string, boolean>;
  open: Set<string>;
  openCalls: string[];
  requestPermissionCalls: string[];
  inQueue: string[];
  lastOut: string[];
  closed: string[];
  cancelled: string[];
  priorityModeCalls: boolean[];
  cancelPendingOnNextTransfer: boolean;
  transferInCalls: Array<{ handle: string; length: number; timeoutMs: number }>;
  transferInError?: Error;
  transferInDelayMs?: number;
  onRequestPermission?: (handle: string) => boolean | Promise<boolean>;
  onTransferOut?: (data: string) => void;
  onTransferInStart?: () => void;
} = {
  available: true,
  os: 'android',
  devices: [],
  permission: new Map(),
  open: new Set(),
  openCalls: [],
  requestPermissionCalls: [],
  inQueue: [],
  lastOut: [],
  closed: [],
  cancelled: [],
  priorityModeCalls: [],
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
              mockNativeState.devices.map(device => {
                const hasPermission = mockNativeState.permission.get(device.handle) === true;
                return {
                  handle: device.handle,
                  vendorId: device.vendorId,
                  productId: device.productId,
                  productName: device.productName ?? null,
                  manufacturerName: device.manufacturerName ?? null,
                  serialNumber: hasPermission ? device.serialNumber ?? null : null,
                  hasPermission,
                };
              })
            )
          ),
          hasPermission: jest.fn((handle: string) =>
            Promise.resolve(mockNativeState.permission.get(handle) === true)
          ),
          requestPermission: jest.fn((handle: string) => {
            mockNativeState.requestPermissionCalls.push(handle);
            if (mockNativeState.onRequestPermission) {
              return Promise.resolve(mockNativeState.onRequestPermission(handle));
            }
            return Promise.resolve(mockNativeState.permission.get(handle) === true);
          }),
          open: jest.fn((handle: string) => {
            if (mockNativeState.permission.get(handle) !== true) {
              const error = new Error('USB permission denied');
              (error as { code?: string }).code = 'USB_PERMISSION';
              return Promise.reject(error);
            }
            mockNativeState.open.add(handle);
            mockNativeState.openCalls.push(handle);
            return Promise.resolve();
          }),
          close: jest.fn((handle: string) => {
            mockNativeState.open.delete(handle);
            mockNativeState.closed.push(handle);
            return Promise.resolve();
          }),
          transferOut: jest.fn((_handle: string, data: string) => {
            mockNativeState.lastOut.push(data);
            mockNativeState.onTransferOut?.(data);
            return Promise.resolve();
          }),
          transferIn: jest.fn(async (handle: string, length: number, timeoutMs: number) => {
            mockNativeState.transferInCalls.push({ handle, length, timeoutMs });
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
          cancel: jest.fn((handle: string) => {
            mockNativeState.cancelled.push(handle);
            return Promise.resolve();
          }),
          setPriorityMode: jest.fn((enabled: boolean) => {
            mockNativeState.priorityModeCalls.push(enabled);
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

function createTransport(options?: ReactNativeUsbTransportOptions) {
  const transport = new ReactNativeUsbTransport(options);
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
        handle: DEVICE_HANDLE,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: DEVICE_SERIAL,
      },
    ];
    mockNativeState.permission = new Map([[DEVICE_HANDLE, true]]);
    mockNativeState.open = new Set();
    mockNativeState.openCalls = [];
    mockNativeState.requestPermissionCalls = [];
    mockNativeState.inQueue = [];
    mockNativeState.lastOut = [];
    mockNativeState.closed = [];
    mockNativeState.cancelled = [];
    mockNativeState.priorityModeCalls = [];
    mockNativeState.cancelPendingOnNextTransfer = false;
    mockNativeState.transferInCalls = [];
    mockNativeState.transferInError = undefined;
    mockNativeState.transferInDelayMs = undefined;
    mockNativeState.onRequestPermission = undefined;
    mockNativeState.onTransferOut = undefined;
    mockNativeState.onTransferInStart = undefined;
    mockNativeEmitter.removeAllListeners();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('enumerate filters OneKey devices and uses USB serialNumber as stable path', async () => {
    mockNativeState.devices.push(
      {
        handle: '/dev/bus/usb/001/098',
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'Trezor Safe',
        manufacturerName: 'Trezor Company',
        serialNumber: 'TREZOR1',
      },
      {
        handle: '/dev/bus/usb/001/099',
        vendorId: 0x1234,
        productId: 0x5678,
        serialNumber: 'other',
      }
    );
    mockNativeState.permission.set('/dev/bus/usb/001/098', true);
    mockNativeState.permission.set('/dev/bus/usb/001/099', true);

    const transport = createTransport();
    await expect(transport.enumerate()).resolves.toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL, commType: 'usb' }),
    ]);
  });

  test('connectId / path equals serial and stays identical across simulated re-plug with new handle', async () => {
    const transport = createTransport();
    const initial = await transport.enumerate();
    expect(initial).toEqual([expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL })]);

    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x53c1,
      serialNumber: null,
    });
    mockNativeState.devices = [
      {
        handle: REPLUG_HANDLE,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: DEVICE_SERIAL,
      },
    ];
    mockNativeState.permission = new Map([[REPLUG_HANDLE, true]]);
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_ATTACHED, {
      handle: REPLUG_HANDLE,
      vendorId: 0x1209,
      productId: 0x53c1,
      productName: 'OneKey Classic 1S',
      manufacturerName: 'OneKey',
      serialNumber: DEVICE_SERIAL,
      hasPermission: true,
    });

    const replugged = await transport.enumerate();
    expect(replugged).toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL }),
    ]);
    expect(replugged[0].path).toBe(initial[0].path);
  });

  test('device without permission prompts once and returns serial path after grant; denied device is omitted and not re-prompted until re-attached', async () => {
    mockNativeState.permission = new Map([[DEVICE_HANDLE, false]]);
    mockNativeState.onRequestPermission = handle => {
      mockNativeState.permission.set(handle, true);
      return true;
    };

    const transport = createTransport();
    const grantedList = await transport.enumerate();
    expect(grantedList).toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL }),
    ]);
    expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);

    // Now test denial: denied device is omitted and not re-prompted during the same plug session.
    mockNativeState.requestPermissionCalls = [];
    mockNativeState.permission = new Map([[DEVICE_HANDLE, false]]);
    mockNativeState.onRequestPermission = () => false;

    await expect(transport.enumerate()).resolves.toEqual([]);
    expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);

    await expect(transport.enumerate()).resolves.toEqual([]);
    expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);

    // Re-attaching clears the denial state and allows prompting again.
    mockNativeState.devices = [
      {
        handle: REPLUG_HANDLE,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: DEVICE_SERIAL,
      },
    ];
    mockNativeState.permission = new Map([[REPLUG_HANDLE, false]]);
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_ATTACHED, {
      handle: REPLUG_HANDLE,
      vendorId: 0x1209,
      productId: 0x53c1,
      serialNumber: null,
      hasPermission: false,
    });
    mockNativeState.onRequestPermission = handle => {
      mockNativeState.permission.set(handle, true);
      return true;
    };

    await expect(transport.enumerate()).resolves.toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL }),
    ]);
    expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE, REPLUG_HANDLE]);
  });

  test('all-zero placeholder serial is kept as-is and empty serial falls back to usb-vid-pid-product', async () => {
    mockNativeState.devices = [
      {
        handle: DEVICE_HANDLE,
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        manufacturerName: 'OneKey',
        serialNumber: '000000000000',
      },
      {
        handle: REPLUG_HANDLE,
        vendorId: 0x1209,
        productId: 0x4f4a,
        productName: null,
        manufacturerName: 'OneKey',
        serialNumber: '000000000000000000000000',
      },
      {
        handle: '/dev/bus/usb/001/004',
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        manufacturerName: 'OneKey',
        serialNumber: '',
      },
    ];
    mockNativeState.permission = new Map([
      [DEVICE_HANDLE, true],
      [REPLUG_HANDLE, true],
      ['/dev/bus/usb/001/004', true],
    ]);

    const transport = createTransport();
    await expect(transport.enumerate()).resolves.toEqual([
      expect.objectContaining({
        path: '000000000000',
        id: '000000000000',
      }),
      expect.objectContaining({
        path: '000000000000000000000000',
        id: '000000000000000000000000',
      }),
      expect.objectContaining({
        path: 'usb-1209-4f4c-onekey-pro-2',
        id: 'usb-1209-4f4c-onekey-pro-2',
      }),
    ]);
  });

  test('concurrent enumerate calls share one permission request', async () => {
    mockNativeState.permission = new Map([[DEVICE_HANDLE, false]]);
    let resolvePrompt!: (granted: boolean) => void;
    mockNativeState.onRequestPermission = handle =>
      new Promise<boolean>(resolve => {
        resolvePrompt = granted => {
          mockNativeState.permission.set(handle, granted);
          resolve(granted);
        };
      });

    const transport = createTransport();
    const firstEnumerate = transport.enumerate();
    const secondEnumerate = transport.enumerate();

    await new Promise(resolve => {
      setImmediate(resolve);
    });
    expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);

    resolvePrompt(true);
    const [firstResult, secondResult] = await Promise.all([firstEnumerate, secondEnumerate]);
    expect(firstResult).toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL }),
    ]);
    expect(secondResult).toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL }),
    ]);
    expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);
  });

  test('acquire after re-plug re-resolves the new handle, requests permission, and opens it', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    await transport.enumerate();
    await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });
    await transport.release(DEVICE_SERIAL);

    // Simulate unplug (Android revokes permission) and re-plug on a new handle without enumerate().
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x53c1,
      serialNumber: null,
    });
    mockNativeState.devices = [
      {
        handle: REPLUG_HANDLE,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: DEVICE_SERIAL,
      },
    ];
    mockNativeState.permission = new Map([[REPLUG_HANDLE, false]]);
    mockNativeState.onRequestPermission = handle => {
      mockNativeState.permission.set(handle, true);
      return true;
    };
    mockNativeState.openCalls = [];
    mockNativeState.requestPermissionCalls = [];

    const acquiredPath = await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });
    expect(acquiredPath).toBe(DEVICE_SERIAL);
    expect(mockNativeState.requestPermissionCalls).toEqual([REPLUG_HANDLE]);
    expect(mockNativeState.openCalls).toEqual([REPLUG_HANDLE]);
    expect(mockNativeState.open.has(REPLUG_HANDLE)).toBe(true);

    const res = await transport.call(DEVICE_SERIAL, 'Initialize', {});
    expect(res.type).toBe('Success');
  });

  test('missing native module returns no devices', async () => {
    mockNativeState.available = false;
    mockNativeState.os = 'ios';
    const transport = createTransport();
    await expect(transport.enumerate()).resolves.toEqual([]);
  });

  test('permission denied returns a typed access error', async () => {
    mockNativeState.permission = new Map([[DEVICE_HANDLE, false]]);
    const transport = createTransport();
    await expect(transport.acquire({ path: DEVICE_SERIAL })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.WebUsbDeviceAccessError,
    });
  });

  test('Protocol V1 call uses 64-byte packets with report id', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });
    mockNativeState.lastOut = [];
    const result = await transport.call(DEVICE_SERIAL, 'Initialize', {});
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
    await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V2' });
    expect(transport.getProtocolType(DEVICE_SERIAL)).toBe('V2');
    const result = await transport.call(DEVICE_SERIAL, 'Ping', { message: 'hi' });
    expect(result.type).toBe('Success');
  });

  test('detach after init() (without listen()) emits DEVICE_DISCONNECT with serial path and cleans state, and stop() unsubscribes', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    const disconnected = jest.fn();
    transport.emitter?.on(TRANSPORT_EVENT.DEVICE_DISCONNECT, disconnected);

    // Calling init/listen again must be idempotent (clear previous subscriptions first).
    await transport.init({ debug: jest.fn(), error: jest.fn() }, transport.emitter);
    transport.listen();

    await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x53c1,
      serialNumber: null,
    });
    await new Promise(resolve => {
      setImmediate(resolve);
    });
    expect(disconnected).toHaveBeenCalledTimes(1);
    expect(disconnected).toHaveBeenCalledWith(
      expect.objectContaining({ id: DEVICE_SERIAL, connectId: DEVICE_SERIAL })
    );
    expect(mockNativeState.cancelled).toContain(DEVICE_HANDLE);
    expect(mockNativeState.closed).toContain(DEVICE_HANDLE);
    expect(transport.getProtocolType(DEVICE_SERIAL)).toBeUndefined();
    await expect(transport.call(DEVICE_SERIAL, 'Initialize', {})).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotFound,
    });

    await transport.stop();
    disconnected.mockClear();
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x53c1,
      serialNumber: DEVICE_SERIAL,
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
    await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V2' });

    mockNativeState.transferInCalls = [];
    const confirmed = await transport.call(DEVICE_SERIAL, 'Ping', { message: 'confirm' });
    expect(confirmed).toMatchObject({ type: 'Success', message: { message: 'confirmed' } });
    expect(mockNativeState.transferInCalls).toHaveLength(3);
    expect(transport.getProtocolType(DEVICE_SERIAL)).toBe('V2');

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
    const pendingCall = transport.call(DEVICE_SERIAL, 'Ping', { message: 'wait' });
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
    await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V2' });
    mockNativeState.closed = [];
    mockNativeState.transferInError = Object.assign(new Error('USB transfer failed'), {
      code: 'USB_TRANSFER_FAILED',
    });

    await expect(transport.call(DEVICE_SERIAL, 'Ping', { message: 'fail' })).rejects.toThrow(
      /transfer failed/i
    );
    expect(transport.getProtocolType(DEVICE_SERIAL)).toBeUndefined();
    expect(mockNativeState.closed).toContain(DEVICE_HANDLE);
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
    await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });

    mockNativeState.transferInCalls = [];
    mockNativeState.transferInError = Object.assign(new Error('USB device disconnected'), {
      code: 'USB_NOT_FOUND',
    });
    await expect(transport.call(DEVICE_SERIAL, 'Initialize', {})).rejects.toMatchObject({
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
    await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });

    mockNativeState.cancelPendingOnNextTransfer = true;
    const transferInStarted = new Promise<void>(resolve => {
      mockNativeState.onTransferInStart = () => {
        mockNativeState.onTransferInStart = undefined;
        resolve();
      };
    });
    const inflight = transport.call(DEVICE_SERIAL, 'Initialize', {});
    await transferInStarted;
    transport.cancel();
    await expect(inflight).rejects.toThrow(/cancelled/i);
    expect(mockNativeState.cancelled).toContain(DEVICE_HANDLE);
    expect(mockNativeState.open.has(DEVICE_HANDLE)).toBe(true);

    mockNativeState.inQueue = [];
    const nextResult = await transport.call(DEVICE_SERIAL, 'Initialize', {});
    expect(nextResult.type).toBe('Success');
  });

  test('empty USB transfer retries are bounded by PACKET_IO_MAX_RETRIES', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });

    mockNativeState.transferInCalls = [];
    mockNativeState.transferInError = Object.assign(new Error('Empty USB transfer'), {
      code: 'USB_TRANSFER_IN',
    });

    await expect(transport.call(DEVICE_SERIAL, 'Initialize', {})).rejects.toThrow(
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
    await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });
    transport.cancel();
    await transport.release(DEVICE_SERIAL);
    expect(mockNativeState.cancelled).toContain(DEVICE_HANDLE);
    expect(mockNativeState.closed).toContain(DEVICE_HANDLE);
  });

  test('never-answered permission times out and enumerate still returns already-permitted devices', async () => {
    mockNativeState.devices = [
      {
        handle: DEVICE_HANDLE,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: DEVICE_SERIAL,
      },
      {
        handle: REPLUG_HANDLE,
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        manufacturerName: 'OneKey Limited',
        serialNumber: 'SN_UNANSWERED',
      },
    ];
    mockNativeState.permission = new Map([
      [DEVICE_HANDLE, true],
      [REPLUG_HANDLE, false],
    ]);

    let resolveLateBroadcast: ((granted: boolean) => void) | undefined;
    mockNativeState.onRequestPermission = () =>
      new Promise<boolean>(resolve => {
        resolveLateBroadcast = resolve;
      });

    const transport = createTransport({ permissionRequestTimeoutMs: 20 });
    try {
      await expect(transport.enumerate()).resolves.toEqual([
        expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL }),
      ]);
      expect(mockNativeState.requestPermissionCalls).toEqual([REPLUG_HANDLE]);

      // Timed-out handle is treated as denied for this plug session; subsequent enumerate skips it.
      await expect(transport.enumerate()).resolves.toEqual([
        expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL }),
      ]);
      expect(mockNativeState.requestPermissionCalls).toEqual([REPLUG_HANDLE]);
    } finally {
      // A late native broadcast arriving after timeout is harmless.
      resolveLateBroadcast?.(false);
      await transport.stop();
    }
  });

  test('enumerate does not prompt a second device while a timed-out native permission is still outstanding', async () => {
    mockNativeState.devices = [
      {
        handle: DEVICE_HANDLE,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: 'SN_FIRST',
      },
      {
        handle: REPLUG_HANDLE,
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        manufacturerName: 'OneKey Limited',
        serialNumber: 'SN_SECOND',
      },
    ];
    mockNativeState.permission = new Map([
      [DEVICE_HANDLE, false],
      [REPLUG_HANDLE, false],
    ]);

    let resolveLateBroadcast: ((granted: boolean) => void) | undefined;
    mockNativeState.onRequestPermission = () =>
      new Promise<boolean>(resolve => {
        resolveLateBroadcast = resolve;
      });

    const transport = createTransport({ permissionRequestTimeoutMs: 20 });
    try {
      await expect(transport.enumerate()).resolves.toEqual([]);
      expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);

      resolveLateBroadcast?.(false);
      await Promise.resolve();
      expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);
    } finally {
      resolveLateBroadcast?.(false);
      await transport.stop();
    }
  });

  test('enumerate prompts unpermitted devices sequentially (second prompt only after first resolves)', async () => {
    mockNativeState.devices = [
      {
        handle: DEVICE_HANDLE,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: 'SN_FIRST',
      },
      {
        handle: REPLUG_HANDLE,
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        manufacturerName: 'OneKey Limited',
        serialNumber: 'SN_SECOND',
      },
    ];
    mockNativeState.permission = new Map([
      [DEVICE_HANDLE, false],
      [REPLUG_HANDLE, false],
    ]);

    const resolvers = new Map<string, (granted: boolean) => void>();
    const promptWaiters: Array<(handle: string) => void> = [];
    const waitForPrompt = () =>
      new Promise<string>(resolve => {
        promptWaiters.push(resolve);
      });
    mockNativeState.onRequestPermission = handle =>
      new Promise<boolean>(resolve => {
        resolvers.set(handle, granted => {
          resolvers.delete(handle);
          mockNativeState.permission.set(handle, granted);
          resolve(granted);
        });
        promptWaiters.shift()?.(handle);
      });

    const transport = createTransport();
    try {
      const firstPrompt = waitForPrompt();
      const enumPromise = transport.enumerate();

      await expect(firstPrompt).resolves.toBe(DEVICE_HANDLE);
      expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);

      const secondPrompt = waitForPrompt();
      resolvers.get(DEVICE_HANDLE)?.(true);
      await expect(secondPrompt).resolves.toBe(REPLUG_HANDLE);
      expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE, REPLUG_HANDLE]);

      resolvers.get(REPLUG_HANDLE)?.(true);
      await expect(enumPromise).resolves.toEqual([
        expect.objectContaining({ path: 'SN_FIRST', id: 'SN_FIRST' }),
        expect.objectContaining({ path: 'SN_SECOND', id: 'SN_SECOND' }),
      ]);
    } finally {
      resolvers.forEach(resolve => resolve(false));
      await transport.stop();
    }
  });

  test('two devices: acquire after re-plug prompts sequentially until matching serial is found and shares concurrent resolution', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const handle1 = '/dev/bus/usb/001/010';
    const handle2 = '/dev/bus/usb/001/011';
    mockNativeState.devices = [
      {
        handle: handle1,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: 'SN_MATCH',
      },
      {
        handle: handle2,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: 'SN_OTHER',
      },
    ];
    mockNativeState.permission = new Map([
      [handle1, false],
      [handle2, false],
    ]);

    const resolvers = new Map<string, (granted: boolean) => void>();
    const promptWaiters: Array<(handle: string) => void> = [];
    const waitForPrompt = () =>
      new Promise<string>(resolve => {
        promptWaiters.push(resolve);
      });
    mockNativeState.onRequestPermission = handle =>
      new Promise<boolean>(resolve => {
        resolvers.set(handle, granted => {
          resolvers.delete(handle);
          mockNativeState.permission.set(handle, granted);
          resolve(granted);
        });
        promptWaiters.shift()?.(handle);
      });

    const transport = createTransport();
    try {
      const firstPrompt = waitForPrompt();
      const acquireOne = transport.acquire({ path: 'SN_MATCH', expectedProtocol: 'V1' });
      const acquireTwo = transport.acquire({ path: 'SN_MATCH', expectedProtocol: 'V1' });

      await expect(firstPrompt).resolves.toBe(handle1);
      expect(mockNativeState.requestPermissionCalls).toEqual([handle1]);

      resolvers.get(handle1)?.(true);
      await expect(Promise.all([acquireOne, acquireTwo])).resolves.toEqual([
        'SN_MATCH',
        'SN_MATCH',
      ]);
      // handle2 was never prompted because handle1 resolved to SN_MATCH, and concurrent acquires shared one prompt.
      expect(mockNativeState.requestPermissionCalls).toEqual([handle1]);

      // Acquiring an absent serial skips handle1 (already mapped to SN_MATCH), prompts only handle2, and throws DeviceNotFound.
      mockNativeState.requestPermissionCalls = [];
      mockNativeState.onRequestPermission = handle => {
        mockNativeState.permission.set(handle, true);
        return true;
      };
      await expect(
        transport.acquire({ path: 'SN_MISSING', expectedProtocol: 'V1' })
      ).rejects.toMatchObject({
        errorCode: HardwareErrorCode.DeviceNotFound,
      });
      expect(mockNativeState.requestPermissionCalls).toEqual([handle2]);
    } finally {
      resolvers.forEach(resolve => resolve(false));
      await transport.stop();
    }
  });

  test('acquire prompts the next candidate when the first granted handle has a different serial', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const handle1 = '/dev/bus/usb/001/010';
    const handle2 = '/dev/bus/usb/001/011';
    mockNativeState.devices = [
      {
        handle: handle1,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: 'SN_OTHER',
      },
      {
        handle: handle2,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: 'SN_SECOND',
      },
    ];
    mockNativeState.permission = new Map([
      [handle1, false],
      [handle2, false],
    ]);

    const resolvers = new Map<string, (granted: boolean) => void>();
    const promptWaiters: Array<(handle: string) => void> = [];
    const waitForPrompt = () =>
      new Promise<string>(resolve => {
        promptWaiters.push(resolve);
      });
    mockNativeState.onRequestPermission = handle =>
      new Promise<boolean>(resolve => {
        resolvers.set(handle, granted => {
          resolvers.delete(handle);
          mockNativeState.permission.set(handle, granted);
          resolve(granted);
        });
        promptWaiters.shift()?.(handle);
      });

    const transport = createTransport();
    try {
      const firstPrompt = waitForPrompt();
      const acquirePromise = transport.acquire({ path: 'SN_SECOND', expectedProtocol: 'V1' });

      await expect(firstPrompt).resolves.toBe(handle1);
      expect(mockNativeState.requestPermissionCalls).toEqual([handle1]);

      const secondPrompt = waitForPrompt();
      resolvers.get(handle1)?.(true);
      await expect(secondPrompt).resolves.toBe(handle2);
      expect(mockNativeState.requestPermissionCalls).toEqual([handle1, handle2]);

      resolvers.get(handle2)?.(true);
      await expect(acquirePromise).resolves.toBe('SN_SECOND');
    } finally {
      resolvers.forEach(resolve => resolve(false));
      await transport.stop();
    }
  });

  test('acquire does not prompt the next candidate until a timed-out native permission settles', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const handle1 = '/dev/bus/usb/001/010';
    const handle2 = '/dev/bus/usb/001/011';
    mockNativeState.devices = [
      {
        handle: handle1,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: 'SN_OTHER',
      },
      {
        handle: handle2,
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'OneKey Classic 1S',
        manufacturerName: 'OneKey',
        serialNumber: 'SN_SECOND',
      },
    ];
    mockNativeState.permission = new Map([
      [handle1, false],
      [handle2, false],
    ]);

    let resolveFirst: ((granted: boolean) => void) | undefined;
    mockNativeState.onRequestPermission = handle => {
      if (handle === handle1) {
        return new Promise<boolean>(resolve => {
          resolveFirst = granted => {
            mockNativeState.permission.set(handle, granted);
            resolve(granted);
          };
        });
      }
      mockNativeState.permission.set(handle, true);
      return true;
    };

    const transport = createTransport({ permissionRequestTimeoutMs: 20 });
    try {
      const acquirePromise = transport.acquire({ path: 'SN_SECOND', expectedProtocol: 'V1' });
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50);
      });
      expect(mockNativeState.requestPermissionCalls).toEqual([handle1]);

      await new Promise<void>(resolve => {
        setTimeout(resolve, 20);
      });
      expect(mockNativeState.requestPermissionCalls).toEqual([handle1]);

      resolveFirst?.(false);
      await expect(acquirePromise).resolves.toBe('SN_SECOND');
      expect(mockNativeState.requestPermissionCalls).toEqual([handle1, handle2]);
    } finally {
      resolveFirst?.(false);
      await transport.stop();
    }
  });

  test('Trezor-PID device with null manufacturer is neither prompted nor listed while OneKey-only PIDs are unaffected', async () => {
    mockNativeState.devices = [
      {
        handle: '/dev/bus/usb/001/020',
        vendorId: 0x1209,
        productId: 0x53c0,
        productName: 'Unknown Bootloader',
        manufacturerName: null,
        serialNumber: 'UNKNOWN_BOOT',
      },
      {
        handle: '/dev/bus/usb/001/021',
        vendorId: 0x1209,
        productId: 0x53c1,
        productName: 'Unknown Wallet',
        manufacturerName: null,
        serialNumber: 'UNKNOWN_FW',
      },
      {
        handle: '/dev/bus/usb/001/022',
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        manufacturerName: null,
        serialNumber: 'PRO2_SERIAL',
      },
    ];
    mockNativeState.permission = new Map([
      ['/dev/bus/usb/001/020', false],
      ['/dev/bus/usb/001/021', true],
      ['/dev/bus/usb/001/022', true],
    ]);

    const transport = createTransport();
    const devices = await transport.enumerate();
    expect(mockNativeState.requestPermissionCalls).toEqual([]);
    expect(devices).toEqual([expect.objectContaining({ path: 'PRO2_SERIAL', id: 'PRO2_SERIAL' })]);
  });

  test('delayed detach after remap does not tear down newer handle and delayed detach after unplug still emits DEVICE_DISCONNECT with serial path', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const transport = createTransport();
    try {
      const disconnected = jest.fn();
      transport.emitter?.on(TRANSPORT_EVENT.DEVICE_DISCONNECT, disconnected);

      await transport.enumerate();
      await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });

      // Re-plug onto REPLUG_HANDLE before the delayed detach event for DEVICE_HANDLE arrives.
      mockNativeState.devices = [
        {
          handle: REPLUG_HANDLE,
          vendorId: 0x1209,
          productId: 0x53c1,
          productName: 'OneKey Classic 1S',
          manufacturerName: 'OneKey',
          serialNumber: DEVICE_SERIAL,
        },
      ];
      mockNativeState.permission = new Map([[REPLUG_HANDLE, true]]);

      await transport.enumerate();
      await transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });
      mockNativeState.closed = [];
      disconnected.mockClear();

      mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
        handle: DEVICE_HANDLE,
        vendorId: 0x1209,
        productId: 0x53c1,
        serialNumber: null,
      });
      await new Promise(resolve => {
        setImmediate(resolve);
      });

      expect(disconnected).not.toHaveBeenCalled();
      expect(mockNativeState.open.has(REPLUG_HANDLE)).toBe(true);
      expect(mockNativeState.closed).not.toContain(REPLUG_HANDLE);
      expect(transport.getProtocolType(DEVICE_SERIAL)).toBe('V1');
      await expect(transport.call(DEVICE_SERIAL, 'Initialize', {})).resolves.toMatchObject({
        type: 'Success',
      });

      // Now REPLUG_HANDLE vanishes before its detach broadcast arrives.
      mockNativeState.devices = [];
      await transport.enumerate();

      mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
        handle: REPLUG_HANDLE,
        vendorId: 0x1209,
        productId: 0x53c1,
        serialNumber: null,
      });
      await new Promise(resolve => {
        setImmediate(resolve);
      });

      expect(disconnected).toHaveBeenCalledTimes(1);
      expect(disconnected).toHaveBeenCalledWith(
        expect.objectContaining({ id: DEVICE_SERIAL, connectId: DEVICE_SERIAL })
      );
      expect(mockNativeState.closed).toContain(REPLUG_HANDLE);
      expect(transport.getProtocolType(DEVICE_SERIAL)).toBeUndefined();
    } finally {
      await transport.stop();
    }
  });

  test('setPriorityMode forwards to native OneKeyUsb module and stop() resets it', async () => {
    const transport = createTransport();
    expect(transport.getPriorityMode()).toBe(false);

    await transport.setPriorityMode(true);
    expect(transport.getPriorityMode()).toBe(true);
    expect(mockNativeState.priorityModeCalls).toEqual([true]);

    await transport.stop();
    expect(transport.getPriorityMode()).toBe(false);
    expect(mockNativeState.priorityModeCalls).toEqual([true, false]);
  });
});
