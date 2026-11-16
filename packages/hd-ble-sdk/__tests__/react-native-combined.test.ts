import { EventEmitter } from 'events';
import { Buffer } from 'buffer';
import { DataManager, isBleConnect } from '@onekeyfe/hd-core';
import { HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';
import transportPackage, { TRANSPORT_EVENT } from '@onekeyfe/hd-transport';
import {
  ONEKEY_USB_DEVICE_ATTACHED,
  ONEKEY_USB_DEVICE_DETACHED,
} from '@onekeyfe/hd-transport-react-native-usb';

import ReactNativeCombinedTransport from '../src/ReactNativeCombinedTransport';

import type { OneKeyDeviceInfo } from '@onekeyfe/hd-transport';

jest.mock('../../core/src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

type NativeDevice = {
  handle: string;
  vendorId: number;
  productId: number;
  productName?: string | null;
  manufacturerName?: string | null;
  serialNumber?: string | null;
};

type MockNativeState = {
  available: boolean;
  os: string;
  devices: NativeDevice[];
  permission: Map<string, boolean>;
  open: Set<string>;
  inQueue: string[];
  lastOut: string[];
  closed: string[];
  cancelled: string[];
  priorityModeCalls: boolean[];
  requestPermissionCalls: string[];
  onRequestPermission?: (handle: string) => boolean | Promise<boolean>;
  onTransferOut?: (data: string) => void;
};

type Listener = (payload: unknown) => void;

type MockEmitter = {
  on: (event: string, handler: Listener) => void;
  off: (event: string, handler: Listener) => void;
  emit: (event: string, payload?: unknown) => void;
  removeAllListeners: () => void;
};

jest.mock(
  'react-native',
  () => {
    const listeners = new Map<string, Set<Listener>>();
    const emitter: MockEmitter = {
      on(event, handler) {
        const set = listeners.get(event) ?? new Set<Listener>();
        set.add(handler);
        listeners.set(event, set);
      },
      off(event, handler) {
        listeners.get(event)?.delete(handler);
      },
      emit(event, payload) {
        listeners.get(event)?.forEach(handler => handler(payload));
      },
      removeAllListeners() {
        listeners.clear();
      },
    };
    const state: MockNativeState = {
      available: true,
      os: 'android',
      devices: [],
      permission: new Map(),
      open: new Set(),
      inQueue: [],
      lastOut: [],
      closed: [],
      cancelled: [],
      priorityModeCalls: [],
      requestPermissionCalls: [],
    };
    return {
      __mockState: state,
      __mockEmitter: emitter,
      PermissionsAndroid: {
        PERMISSIONS: {
          BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
          BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
        },
        requestMultiple: jest.fn().mockResolvedValue({
          'android.permission.BLUETOOTH_CONNECT': 'granted',
          'android.permission.BLUETOOTH_SCAN': 'granted',
        }),
      },
      Platform: {
        get OS() {
          return state.os;
        },
        Version: 33,
      },
      NativeModules: {
        get OneKeyUsb() {
          if (!state.available) {
            return undefined;
          }
          return {
            getDevices: jest.fn(() =>
              Promise.resolve(
                state.devices.map(device => {
                  const hasPermission = state.permission.get(device.handle) === true;
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
              Promise.resolve(state.permission.get(handle) === true)
            ),
            requestPermission: jest.fn((handle: string) => {
              state.requestPermissionCalls.push(handle);
              if (state.onRequestPermission) {
                return Promise.resolve(state.onRequestPermission(handle));
              }
              return Promise.resolve(state.permission.get(handle) === true);
            }),
            open: jest.fn((handle: string) => {
              if (state.permission.get(handle) !== true) {
                const error = new Error('USB permission denied');
                (error as { code?: string }).code = 'USB_PERMISSION';
                return Promise.reject(error);
              }
              state.open.add(handle);
              return Promise.resolve();
            }),
            close: jest.fn((handle: string) => {
              state.open.delete(handle);
              state.closed.push(handle);
              return Promise.resolve();
            }),
            transferOut: jest.fn((_handle: string, data: string) => {
              state.lastOut.push(data);
              state.onTransferOut?.(data);
              return Promise.resolve();
            }),
            transferIn: jest.fn(() => {
              const next = state.inQueue.shift();
              if (!next) {
                const error = new Error('USB transfer timeout');
                (error as { code?: string }).code = 'USB_TIMEOUT';
                return Promise.reject(error);
              }
              return Promise.resolve(next);
            }),
            cancel: jest.fn((handle: string) => {
              state.cancelled.push(handle);
              return Promise.resolve();
            }),
            setPriorityMode: jest.fn((enabled: boolean) => {
              state.priorityModeCalls.push(enabled);
              return Promise.resolve();
            }),
          };
        },
      },
      NativeEventEmitter: jest.fn(() => ({
        addListener: (event: string, handler: Listener) => {
          emitter.on(event, handler);
          return {
            remove: () => emitter.off(event, handler),
          };
        },
      })),
    };
  },
  { virtual: true }
);

const rnMock = jest.requireMock<{
  __mockState: MockNativeState;
  __mockEmitter: MockEmitter;
}>('react-native');
const mockNativeState = rnMock.__mockState;
const mockNativeEmitter = rnMock.__mockEmitter;

const DEVICE_HANDLE = '/dev/bus/usb/001/002';
const BOOTLOADER_HANDLE = '/dev/bus/usb/001/003';
const DEVICE_SERIAL = 'SN_PRO2_USB';
const BLE_MAC = 'AA:BB:CC:DD:EE:FF';

jest.mock('react-native-ble-plx', () => {
  function MockBleError(this: Error, message?: string) {
    this.name = 'BleError';
    this.message = message ?? '';
  }
  MockBleError.prototype = Error.prototype;

  return {
    BleATTErrorCode: { UnlikelyError: 14 },
    BleError: MockBleError,
    BleErrorCode: {
      DeviceAlreadyConnected: 203,
      DeviceDisconnected: 201,
      DeviceMTUChangeFailed: 206,
      OperationCancelled: 2,
      CharacteristicNotFound: 404,
    },
    BleManager: jest.fn(() => ({
      destroy: jest.fn(),
      stopDeviceScan: jest.fn(),
      cancelDeviceConnection: jest.fn().mockResolvedValue(undefined),
      cancelTransaction: jest.fn().mockResolvedValue(undefined),
    })),
    ConnectionPriority: { Balanced: 0, High: 1, LowPower: 2 },
    ScanMode: { LowLatency: 2 },
  };
});

jest.mock('@onekeyfe/react-native-ble-utils', () => ({
  isOneKeyBleDevice: jest.fn(() => true),
}));

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

const v1Messages = parseConfigure(protocolV1Schema);

function v1SuccessPacket(): string {
  const chunks = ProtocolV1.encodeTransportPackets(v1Messages, 'Success', {
    message: 'ok',
  });
  const buffer = chunks[0].toBuffer();
  return Buffer.from(buffer as unknown as ArrayBuffer).toString('base64');
}

function makeBleDevice(id = BLE_MAC, name = 'OneKey Pro 2'): OneKeyDeviceInfo {
  return {
    id,
    path: id,
    name,
    commType: 'ble',
    debug: false,
  };
}

async function createCombinedTransport(options?: {
  bleDevices?: OneKeyDeviceInfo[];
  permissionRequestTimeoutMs?: number;
}) {
  const logger = { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), log: jest.fn() };
  const emitter = new EventEmitter();
  const transport = new ReactNativeCombinedTransport({
    scanTimeout: 50,
    usbOptions: { permissionRequestTimeoutMs: options?.permissionRequestTimeoutMs },
  });

  const bleDevices = options?.bleDevices ?? [makeBleDevice()];
  const bleProtocols = new Map<string, 'V1' | 'V2'>();
  const bleEnumerateSpy = jest
    .spyOn(transport.bleTransport, 'enumerate')
    .mockImplementation(() => Promise.resolve(bleDevices as never));
  const bleAcquireSpy = jest.spyOn(transport.bleTransport, 'acquire').mockImplementation(input => {
    const resolved = { uuid: input.uuid, protocolType: 'V2' as const };
    bleProtocols.set(input.uuid, 'V2');
    return Promise.resolve(resolved as never);
  });
  const bleCallSpy = jest
    .spyOn(transport.bleTransport, 'call')
    .mockResolvedValue({ type: 'Success', message: { message: 'ble-ok' } });
  const blePostSpy = jest.spyOn(transport.bleTransport, 'post').mockResolvedValue(undefined);
  const bleReleaseSpy = jest
    .spyOn(transport.bleTransport, 'release')
    .mockResolvedValue(true as never);
  const bleDisconnectSpy = jest
    .spyOn(transport.bleTransport, 'disconnect')
    .mockImplementation(session => {
      bleProtocols.delete(session);
      return Promise.resolve();
    });
  const bleGetProtocolTypeSpy = jest
    .spyOn(transport.bleTransport, 'getProtocolType')
    .mockImplementation(path => bleProtocols.get(path));

  await transport.init(logger, emitter);
  await transport.configure(protocolV1Schema as unknown as JSON);
  await transport.configureProtocolV2(protocolV2Schema as unknown as JSON);

  return {
    transport,
    logger,
    emitter,
    spies: {
      bleEnumerateSpy,
      bleAcquireSpy,
      bleCallSpy,
      blePostSpy,
      bleReleaseSpy,
      bleDisconnectSpy,
      bleGetProtocolTypeSpy,
    },
  };
}

describe('ReactNativeCombinedTransport', () => {
  let activeTransports: ReactNativeCombinedTransport[] = [];

  beforeEach(() => {
    activeTransports = [];
    DataManager.setActiveCommType(undefined);
    mockNativeState.available = true;
    mockNativeState.os = 'android';
    mockNativeState.devices = [
      {
        handle: DEVICE_HANDLE,
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        manufacturerName: 'OneKey',
        serialNumber: DEVICE_SERIAL,
      },
    ];
    mockNativeState.permission = new Map([[DEVICE_HANDLE, true]]);
    mockNativeState.open = new Set();
    mockNativeState.inQueue = [];
    mockNativeState.lastOut = [];
    mockNativeState.closed = [];
    mockNativeState.cancelled = [];
    mockNativeState.priorityModeCalls = [];
    mockNativeState.requestPermissionCalls = [];
    mockNativeState.onRequestPermission = undefined;
    mockNativeState.onTransferOut = undefined;
    mockNativeEmitter.removeAllListeners();
  });

  afterEach(async () => {
    for (const transport of activeTransports) {
      await transport.stop().catch(() => undefined);
    }
    DataManager.setActiveCommType(undefined);
    jest.restoreAllMocks();
  });

  test('isBleConnect invariants for react-native, react-native-usb, and react-native-combined', () => {
    expect(DataManager.isBleConnect('react-native')).toBe(true);
    expect(isBleConnect('react-native')).toBe(true);
    expect(DataManager.isBleConnect('react-native-usb')).toBe(false);
    expect(isBleConnect('react-native-usb')).toBe(false);

    // Unknown activeCommType is NOT BLE until combined transport confirms BLE
    expect(DataManager.getActiveCommType()).toBeUndefined();
    expect(DataManager.isBleConnect('react-native-combined')).toBe(false);
    expect(isBleConnect('react-native-combined')).toBe(false);

    DataManager.setActiveCommType('usb');
    expect(DataManager.isBleConnect('react-native-combined')).toBe(false);
    expect(isBleConnect('react-native-combined')).toBe(false);

    DataManager.setActiveCommType('ble');
    expect(DataManager.isBleConnect('react-native-combined')).toBe(true);
    expect(isBleConnect('react-native-combined')).toBe(true);
  });

  test('permitted USB device present -> enumerate returns only USB, activeCommType is usb, isBleConnect is false', async () => {
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    const devices = await ctx.transport.enumerate();
    expect(devices).toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL, commType: 'usb' }),
    ]);
    expect(DataManager.getActiveCommType()).toBe('usb');
    expect(DataManager.isBleConnect('react-native-combined')).toBe(false);
    expect(ctx.spies.bleEnumerateSpy).not.toHaveBeenCalled();
  });

  test('no USB device -> falls back to BLE and isBleConnect is true', async () => {
    mockNativeState.devices = [];
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    const devices = await ctx.transport.enumerate();
    expect(devices).toEqual([expect.objectContaining({ id: BLE_MAC, commType: 'ble' })]);
    expect(DataManager.getActiveCommType()).toBe('ble');
    expect(DataManager.isBleConnect('react-native-combined')).toBe(true);
    expect(ctx.spies.bleEnumerateSpy).toHaveBeenCalledTimes(1);
  });

  test('USB permission denied / unpermitted awaits in-flight request, then falls back to BLE on denial', async () => {
    mockNativeState.permission = new Map([[DEVICE_HANDLE, false]]);
    let resolvePrompt!: (granted: boolean) => void;
    mockNativeState.onRequestPermission = handle =>
      new Promise<boolean>(resolve => {
        resolvePrompt = granted => {
          mockNativeState.permission.set(handle, granted);
          resolve(granted);
        };
      });

    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    const pendingEnumerate = ctx.transport.enumerate();
    await new Promise(resolve => {
      setImmediate(resolve);
    });
    // Permission request is still in flight; BLE must not have been scanned yet.
    expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);
    expect(ctx.spies.bleEnumerateSpy).not.toHaveBeenCalled();

    // User denies permission -> falls back to BLE.
    resolvePrompt(false);
    const devicesAfterDeny = await pendingEnumerate;
    expect(devicesAfterDeny).toEqual([expect.objectContaining({ id: BLE_MAC, commType: 'ble' })]);
    expect(DataManager.getActiveCommType()).toBe('ble');
    expect(DataManager.isBleConnect('react-native-combined')).toBe(true);

    // Subsequent enumerate skips re-prompting the denied handle and still returns BLE.
    const devicesRepeat = await ctx.transport.enumerate();
    expect(devicesRepeat).toEqual([expect.objectContaining({ id: BLE_MAC, commType: 'ble' })]);
    expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);
  });

  test('routing: acquire/call/release of a USB path never hits BLE, and BLE MAC never hits USB', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };

    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    const usbAcquireSpy = jest.spyOn(ctx.transport.usbTransport, 'acquire');
    const usbCallSpy = jest.spyOn(ctx.transport.usbTransport, 'call');
    const usbReleaseSpy = jest.spyOn(ctx.transport.usbTransport, 'release');
    const usbEnumerateSpy = jest.spyOn(ctx.transport.usbTransport, 'enumerate');

    // USB flow
    await ctx.transport.enumerate();
    const session = await ctx.transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });
    expect(session).toBe(DEVICE_SERIAL);
    expect(ctx.transport.getProtocolType(DEVICE_SERIAL)).toBe('V1');
    const usbRes = await ctx.transport.call(DEVICE_SERIAL, 'Initialize', {});
    expect(usbRes.type).toBe('Success');
    await ctx.transport.release(DEVICE_SERIAL, false);

    expect(usbAcquireSpy).toHaveBeenCalledTimes(1);
    expect(usbCallSpy).toHaveBeenCalledTimes(1);
    expect(usbReleaseSpy).toHaveBeenCalledTimes(1);
    expect(ctx.spies.bleAcquireSpy).not.toHaveBeenCalled();
    expect(ctx.spies.bleCallSpy).not.toHaveBeenCalled();
    expect(ctx.spies.bleReleaseSpy).not.toHaveBeenCalled();

    // BLE flow when no USB device is connected (even without calling enumerate first)
    mockNativeState.devices = [];
    usbAcquireSpy.mockClear();
    usbCallSpy.mockClear();
    usbReleaseSpy.mockClear();
    usbEnumerateSpy.mockClear();

    const bleAcquireResult = await ctx.transport.acquire({ uuid: BLE_MAC, expectedProtocol: 'V2' });
    expect(bleAcquireResult).toEqual({ uuid: BLE_MAC, protocolType: 'V2' });
    expect(DataManager.getActiveCommType()).toBe('ble');
    expect(ctx.transport.getProtocolType(BLE_MAC)).toBe('V2');

    const bleRes = await ctx.transport.call(BLE_MAC, 'Ping', { message: 'hi' });
    expect(bleRes).toEqual({ type: 'Success', message: { message: 'ble-ok' } });
    await ctx.transport.release(BLE_MAC, false);

    expect(ctx.spies.bleAcquireSpy).toHaveBeenCalledTimes(1);
    expect(ctx.spies.bleCallSpy).toHaveBeenCalledTimes(1);
    expect(ctx.spies.bleReleaseSpy).toHaveBeenCalledTimes(1);
    expect(usbAcquireSpy).not.toHaveBeenCalled();
    expect(usbCallSpy).not.toHaveBeenCalled();
    expect(usbReleaseSpy).not.toHaveBeenCalled();
  });

  test('unknown non-MAC BLE identifier resolves via BLE enumerate map rather than shape alone', async () => {
    mockNativeState.devices = [];
    const customBleId = 'ble-opaque-handle';
    const ctx = await createCombinedTransport({
      bleDevices: [makeBleDevice(customBleId, 'OneKey Pro 2')],
    });
    activeTransports.push(ctx.transport);

    const usbAcquireSpy = jest.spyOn(ctx.transport.usbTransport, 'acquire');

    // Acquire directly without prior enumerate(); map lookup checks USB then BLE enumerate maps.
    const result = await ctx.transport.acquire({ path: customBleId });
    expect(result).toEqual({ uuid: customBleId, protocolType: 'V2' });
    expect(ctx.spies.bleEnumerateSpy).toHaveBeenCalledTimes(1);
    expect(ctx.spies.bleAcquireSpy).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: customBleId })
    );
    expect(usbAcquireSpy).not.toHaveBeenCalled();
  });

  test('in-flight BLE session is not interrupted when USB attaches; next enumerate after release flips to USB', async () => {
    mockNativeState.devices = [];
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    await ctx.transport.enumerate();
    expect(DataManager.getActiveCommType()).toBe('ble');

    await ctx.transport.acquire({ uuid: BLE_MAC, expectedProtocol: 'V2' });

    // Permitted USB attaches while BLE session is active.
    mockNativeState.devices = [
      {
        handle: DEVICE_HANDLE,
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        manufacturerName: 'OneKey',
        serialNumber: DEVICE_SERIAL,
      },
    ];
    mockNativeState.permission = new Map([[DEVICE_HANDLE, true]]);
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_ATTACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x4f4c,
      productName: 'OneKey Pro 2',
      manufacturerName: 'OneKey',
      serialNumber: DEVICE_SERIAL,
      hasPermission: true,
    });

    // Active BLE session stays on BLE and is undisturbed.
    expect(DataManager.getActiveCommType()).toBe('ble');
    expect(DataManager.isBleConnect('react-native-combined')).toBe(true);
    const duringSession = await ctx.transport.enumerate();
    expect(duringSession).toEqual([expect.objectContaining({ id: BLE_MAC, commType: 'ble' })]);
    expect(DataManager.getActiveCommType()).toBe('ble');

    const callRes = await ctx.transport.call(BLE_MAC, 'Ping', { message: 'still-ble' });
    expect(callRes).toEqual({ type: 'Success', message: { message: 'ble-ok' } });

    // Even with keepSession=true (used by Pro2/Neo BLE), release ends the in-use session.
    await ctx.transport.release(BLE_MAC, false, true);

    const afterRelease = await ctx.transport.enumerate();
    expect(afterRelease).toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, id: DEVICE_SERIAL, commType: 'usb' }),
    ]);
    expect(DataManager.getActiveCommType()).toBe('usb');
    expect(DataManager.isBleConnect('react-native-combined')).toBe(false);
  });

  test('USB attach flips preference only for permitted OneKey devices and detach does not double-emit', async () => {
    mockNativeState.devices = [];
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    const disconnected = jest.fn();
    ctx.emitter.on(TRANSPORT_EVENT.DEVICE_DISCONNECT, disconnected);

    await ctx.transport.enumerate();
    expect(DataManager.getActiveCommType()).toBe('ble');

    // Unpermitted attach does not flip to USB.
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_ATTACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x4f4c,
      serialNumber: null,
      hasPermission: false,
    });
    expect(DataManager.getActiveCommType()).toBe('ble');

    // Permitted non-OneKey / unknown-manufacturer Trezor-PID attach does not flip to USB.
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_ATTACHED, {
      handle: '/dev/bus/usb/001/099',
      vendorId: 0x1209,
      productId: 0x53c1,
      manufacturerName: null,
      serialNumber: 'TREZOR1',
      hasPermission: true,
    });
    expect(DataManager.getActiveCommType()).toBe('ble');

    // Permitted OneKey USB attach flips preference to USB.
    mockNativeState.devices = [
      {
        handle: DEVICE_HANDLE,
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        manufacturerName: 'OneKey',
        serialNumber: DEVICE_SERIAL,
      },
    ];
    mockNativeState.permission = new Map([[DEVICE_HANDLE, true]]);
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_ATTACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x4f4c,
      productName: 'OneKey Pro 2',
      manufacturerName: 'OneKey',
      serialNumber: DEVICE_SERIAL,
      hasPermission: true,
    });
    expect(DataManager.getActiveCommType()).toBe('usb');

    // Enumerate then detach: only one DEVICE_DISCONNECT event from inner USB transport.
    await ctx.transport.enumerate();
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x4f4c,
      serialNumber: null,
    });
    await new Promise(resolve => {
      setImmediate(resolve);
    });
    expect(disconnected).toHaveBeenCalledTimes(1);
    expect(disconnected).toHaveBeenCalledWith(
      expect.objectContaining({ id: DEVICE_SERIAL, connectId: DEVICE_SERIAL })
    );
  });

  test('priority mode: USB detach then empty enumerate stays on USB, and later bootloader attach is still USB', async () => {
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    expect(await ctx.transport.enumerate()).toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, commType: 'usb' }),
    ]);
    expect(DataManager.getActiveCommType()).toBe('usb');

    await ctx.transport.setPriorityMode(true);
    expect(mockNativeState.priorityModeCalls).toEqual([true]);

    // Simulate device rebooting to bootloader (temporary USB detach).
    mockNativeState.devices = [];
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x4f4c,
      serialNumber: null,
    });

    // While priority mode is ON, empty USB enumerate must NOT flip to BLE or scan BLE.
    await expect(ctx.transport.enumerate()).resolves.toEqual([]);
    expect(DataManager.getActiveCommType()).toBe('usb');
    expect(DataManager.isBleConnect('react-native-combined')).toBe(false);
    expect(ctx.spies.bleEnumerateSpy).not.toHaveBeenCalled();

    // Bootloader re-attaches on USB with a new handle.
    mockNativeState.devices = [
      {
        handle: BOOTLOADER_HANDLE,
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2 Bootloader',
        manufacturerName: 'OneKey',
        serialNumber: DEVICE_SERIAL,
      },
    ];
    mockNativeState.permission = new Map([[BOOTLOADER_HANDLE, true]]);
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_ATTACHED, {
      handle: BOOTLOADER_HANDLE,
      vendorId: 0x1209,
      productId: 0x4f4c,
      productName: 'OneKey Pro 2 Bootloader',
      manufacturerName: 'OneKey',
      serialNumber: DEVICE_SERIAL,
      hasPermission: true,
    });

    await expect(ctx.transport.enumerate()).resolves.toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, commType: 'usb' }),
    ]);
    expect(DataManager.getActiveCommType()).toBe('usb');
    expect(ctx.spies.bleEnumerateSpy).not.toHaveBeenCalled();
  });

  test('priority mode off: USB detach with no remaining devices -> next enumerate is BLE', async () => {
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    await ctx.transport.setPriorityMode(true);
    await ctx.transport.enumerate();
    expect(DataManager.getActiveCommType()).toBe('usb');

    await ctx.transport.setPriorityMode(false);
    expect(mockNativeState.priorityModeCalls).toEqual([true, false]);

    mockNativeState.devices = [];
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x4f4c,
      serialNumber: null,
    });

    const devices = await ctx.transport.enumerate();
    expect(devices).toEqual([expect.objectContaining({ id: BLE_MAC, commType: 'ble' })]);
    expect(DataManager.getActiveCommType()).toBe('ble');
    expect(DataManager.isBleConnect('react-native-combined')).toBe(true);
  });

  test('cancel / stop / configure / configureProtocolV2 apply to both transports and still clean the second if first fails', async () => {
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    const usbCancelSpy = jest.spyOn(ctx.transport.usbTransport, 'cancel').mockImplementation(() => {
      throw new Error('usb cancel failed');
    });
    const bleCancelSpy = jest.spyOn(ctx.transport.bleTransport, 'cancel').mockResolvedValue();

    await expect(ctx.transport.cancel()).rejects.toThrow('usb cancel failed');
    expect(usbCancelSpy).toHaveBeenCalledTimes(1);
    expect(bleCancelSpy).toHaveBeenCalledTimes(1);
    expect(ctx.logger.error).toHaveBeenCalled();

    const usbStopSpy = jest
      .spyOn(ctx.transport.usbTransport, 'stop')
      .mockRejectedValue(new Error('usb stop failed'));
    const bleStopSpy = jest.spyOn(ctx.transport.bleTransport, 'stop').mockResolvedValue();

    await expect(ctx.transport.stop()).rejects.toThrow('usb stop failed');
    expect(usbStopSpy).toHaveBeenCalledTimes(1);
    expect(bleStopSpy).toHaveBeenCalledTimes(1);
    expect(DataManager.getActiveCommType()).toBeUndefined();
  });

  test('saved USB serial connectId before any enumerate() resolves to USB, and unplugged USB serial fails cleanly without BLE', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    const usbAcquireSpy = jest.spyOn(ctx.transport.usbTransport, 'acquire');

    // No enumerate() called yet; activeCommType is undefined.
    expect(DataManager.getActiveCommType()).toBeUndefined();
    const session = await ctx.transport.acquire({
      path: DEVICE_SERIAL,
      uuid: DEVICE_SERIAL,
      expectedProtocol: 'V1',
    });
    expect(session).toBe(DEVICE_SERIAL);
    expect(DataManager.getActiveCommType()).toBe('usb');
    expect(usbAcquireSpy).toHaveBeenCalledWith(expect.objectContaining({ path: DEVICE_SERIAL }));
    expect(ctx.spies.bleAcquireSpy).not.toHaveBeenCalled();

    await ctx.transport.release(DEVICE_SERIAL, false);

    // When USB is unplugged and activeCommType is reset to undefined, an unknown non-MAC
    // serial passed with both path and uuid rejects with USB DeviceNotFound rather than BLE.
    mockNativeState.devices = [];
    DataManager.setActiveCommType(undefined);
    await expect(
      ctx.transport.acquire({ path: 'SN_UNPLUGGED_USB', uuid: 'SN_UNPLUGGED_USB' })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.DeviceNotFound });
    expect(ctx.spies.bleAcquireSpy).not.toHaveBeenCalled();
  });

  test('setPriorityMode(true) with undefined activeCommType + known USB sets usb and skips BLE scan', async () => {
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    // Enumerate so USB device is known, then clear activeCommType to simulate undefined state.
    await ctx.transport.enumerate();
    DataManager.setActiveCommType(undefined);

    await ctx.transport.setPriorityMode(true);
    expect(DataManager.getActiveCommType()).toBe('usb');
    expect(DataManager.isBleConnect('react-native-combined')).toBe(false);

    // Empty USB enumerate while priority mode is on must stay on USB and skip BLE scan.
    mockNativeState.devices = [];
    await expect(ctx.transport.enumerate()).resolves.toEqual([]);
    expect(ctx.spies.bleEnumerateSpy).not.toHaveBeenCalled();
    expect(DataManager.getActiveCommType()).toBe('usb');

    // Even if activeCommType was undefined before any USB device was seen, priority mode skips BLE scan.
    await ctx.transport.setPriorityMode(false);
    DataManager.setActiveCommType(undefined);
    await ctx.transport.setPriorityMode(true);
    await expect(ctx.transport.enumerate()).resolves.toEqual([]);
    await expect(ctx.transport.acquire({ path: 'SN_REBOOTING' })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotFound,
    });
    expect(ctx.spies.bleEnumerateSpy).not.toHaveBeenCalled();
  });

  test('enumerate/acquire race keeps the BLE session when BLE starts during USB permission prompt', async () => {
    mockNativeState.permission = new Map([[DEVICE_HANDLE, false]]);
    const permissionGate = createDeferred<boolean>();
    mockNativeState.onRequestPermission = handle =>
      permissionGate.promise.then(granted => {
        mockNativeState.permission.set(handle, granted);
        return granted;
      });

    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    // Start enumerate(); it awaits USB permission prompt.
    const pendingEnumerate = ctx.transport.enumerate();
    await new Promise(resolve => {
      setImmediate(resolve);
    });
    expect(mockNativeState.requestPermissionCalls).toEqual([DEVICE_HANDLE]);

    // Meanwhile, user starts a BLE acquire for BLE_MAC.
    const bleAcquireGate = createDeferred<{ uuid: string; protocolType: 'V2' }>();
    ctx.spies.bleAcquireSpy.mockImplementationOnce(() => bleAcquireGate.promise as never);
    const pendingBleAcquire = ctx.transport.acquire({ uuid: BLE_MAC, expectedProtocol: 'V2' });

    // Now USB permission is granted and USB device enumerates.
    permissionGate.resolve(true);
    const enumResult = await pendingEnumerate;

    // Combined transport must keep BLE active and NOT overwrite activeCommType or list with USB.
    expect(enumResult).toEqual([expect.objectContaining({ id: BLE_MAC, commType: 'ble' })]);
    expect(DataManager.getActiveCommType()).toBe('ble');

    bleAcquireGate.resolve({ uuid: BLE_MAC, protocolType: 'V2' });
    await expect(pendingBleAcquire).resolves.toEqual({ uuid: BLE_MAC, protocolType: 'V2' });
    expect(DataManager.getActiveCommType()).toBe('ble');

    // While priority mode is ON, enumerate() must not take the BLE branch even if a BLE session exists.
    await ctx.transport.setPriorityMode(true);
    ctx.spies.bleEnumerateSpy.mockClear();
    const priorityEnum = await ctx.transport.enumerate();
    expect(priorityEnum).toEqual([
      expect.objectContaining({ path: DEVICE_SERIAL, commType: 'usb' }),
    ]);
    expect(ctx.spies.bleEnumerateSpy).not.toHaveBeenCalled();
  });

  test('cancel() isolates USB vs BLE based on active sessions/in-flight ops and activeCommType', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    const usbCancelSpy = jest
      .spyOn(ctx.transport.usbTransport, 'cancel')
      .mockImplementation(() => {});
    const bleCancelSpy = jest.spyOn(ctx.transport.bleTransport, 'cancel').mockResolvedValue();

    // 1. Only USB active -> cancel hits USB only.
    await ctx.transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });
    await ctx.transport.cancel();
    expect(usbCancelSpy).toHaveBeenCalledTimes(1);
    expect(bleCancelSpy).not.toHaveBeenCalled();

    usbCancelSpy.mockClear();
    bleCancelSpy.mockClear();
    await ctx.transport.release(DEVICE_SERIAL, false);

    // 2. Only BLE active -> cancel hits BLE only.
    mockNativeState.devices = [];
    await ctx.transport.acquire({ uuid: BLE_MAC, expectedProtocol: 'V2' });
    await ctx.transport.cancel();
    expect(bleCancelSpy).toHaveBeenCalledTimes(1);
    expect(usbCancelSpy).not.toHaveBeenCalled();

    // 3. Both have active sessions -> cancel hits only the side matching activeCommType.
    usbCancelSpy.mockClear();
    bleCancelSpy.mockClear();
    mockNativeState.devices = [
      {
        handle: DEVICE_HANDLE,
        vendorId: 0x1209,
        productId: 0x4f4c,
        productName: 'OneKey Pro 2',
        manufacturerName: 'OneKey',
        serialNumber: DEVICE_SERIAL,
      },
    ];
    mockNativeState.permission = new Map([[DEVICE_HANDLE, true]]);
    await ctx.transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });
    expect(DataManager.getActiveCommType()).toBe('usb');

    await ctx.transport.cancel();
    expect(usbCancelSpy).toHaveBeenCalledTimes(1);
    expect(bleCancelSpy).not.toHaveBeenCalled();

    usbCancelSpy.mockClear();
    bleCancelSpy.mockClear();
    DataManager.setActiveCommType('ble');
    await ctx.transport.cancel();
    expect(bleCancelSpy).toHaveBeenCalledTimes(1);
    expect(usbCancelSpy).not.toHaveBeenCalled();
  });

  test('USB detach prunes activeSessions and pathToTransport entries for that device', async () => {
    mockNativeState.onTransferOut = () => {
      mockNativeState.inQueue.push(v1SuccessPacket());
    };
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    await ctx.transport.enumerate();
    await ctx.transport.acquire({ path: DEVICE_SERIAL, expectedProtocol: 'V1' });

    const internals = ctx.transport as unknown as {
      activeSessions: Map<string, string>;
      pathToTransport: Map<string, string>;
    };
    expect(internals.activeSessions.get(DEVICE_SERIAL)).toBe('usb');
    expect(internals.pathToTransport.get(DEVICE_SERIAL)).toBe('usb');

    // Emit detach for the current handle -> both activeSessions and pathToTransport must be pruned.
    mockNativeState.devices = [];
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      handle: DEVICE_HANDLE,
      vendorId: 0x1209,
      productId: 0x4f4c,
      serialNumber: DEVICE_SERIAL,
    });
    await new Promise(resolve => {
      setImmediate(resolve);
    });

    expect(internals.activeSessions.has(DEVICE_SERIAL)).toBe(false);
    expect(internals.pathToTransport.has(DEVICE_SERIAL)).toBe(false);

    // Detach for an unmapped device carrying only serialNumber also prunes pathToTransport.
    internals.pathToTransport.set('SN_DIRECT_DETACH', 'usb');
    internals.activeSessions.set('SN_DIRECT_DETACH', 'usb');
    mockNativeEmitter.emit(ONEKEY_USB_DEVICE_DETACHED, {
      handle: '/dev/bus/usb/001/099',
      vendorId: 0x1209,
      productId: 0x4f4c,
      serialNumber: 'SN_DIRECT_DETACH',
    });
    expect(internals.activeSessions.has('SN_DIRECT_DETACH')).toBe(false);
    expect(internals.pathToTransport.has('SN_DIRECT_DETACH')).toBe(false);
  });

  test('empty-key acquire rejects cleanly with DeviceNotFound before touching inner transports', async () => {
    const ctx = await createCombinedTransport();
    activeTransports.push(ctx.transport);

    const usbAcquireSpy = jest.spyOn(ctx.transport.usbTransport, 'acquire');

    await expect(ctx.transport.acquire({})).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotFound,
    });
    await expect(ctx.transport.acquire({ path: '', uuid: '   ' })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotFound,
    });

    expect(usbAcquireSpy).not.toHaveBeenCalled();
    expect(ctx.spies.bleAcquireSpy).not.toHaveBeenCalled();
  });
});
