import ByteBuffer from 'bytebuffer';
import { Buffer } from 'buffer';
import transport, {
  PROTOCOL_V1_CHUNK_PAYLOAD_SIZE,
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V1_REPORT_ID,
  PROTOCOL_V1_USB_PACKET_SIZE,
  PROTOCOL_V2_CHANNEL_USB,
  PROTOCOL_V2_FRAME_MAX_BYTES,
  ProtocolV2LinkError,
  ProtocolV2UsbTransportBase,
  TRANSPORT_EVENT,
  probeProtocolV2 as probeProtocolV2Helper,
} from '@onekeyfe/hd-transport';
import {
  ERRORS,
  HardwareErrorCode,
  ONEKEY_WEBUSB_FILTER,
  inferProtocolHintFromUsbId,
  isKnownTrezorWebUsbDevice,
  resolveOneKeyUsbDevicePath,
  wait,
} from '@onekeyfe/hd-shared';

import {
  ONEKEY_USB_DEVICE_ATTACHED,
  ONEKEY_USB_DEVICE_DETACHED,
  createUsbEventEmitter,
  decodeUsbPacket,
  encodeUsbPacket,
  getOneKeyUsbModule,
  isNativeUsbAvailable,
  mapNativeUsbError,
  setUsbPriorityMode,
  subscribeUsbDeviceEvents,
} from './nativeModule';

import type EventEmitter from 'events';
import type { EmitterSubscription, NativeEventEmitter } from 'react-native';
import type {
  AcquireInput,
  OneKeyDeviceInfo,
  ProtocolType,
  ProtocolV2CallContext,
  ProtocolV2Schemas,
  TransportCallOptions,
} from '@onekeyfe/hd-transport';
import type { NativeUsbDeviceEvent, NativeUsbDeviceInfo } from './nativeModule';

const { parseConfigure, ProtocolV1, check } = transport;

const PACKET_SIZE = PROTOCOL_V1_USB_PACKET_SIZE;
const REPORT_ID = PROTOCOL_V1_REPORT_ID;
const PAYLOAD_SIZE = PROTOCOL_V1_CHUNK_PAYLOAD_SIZE;
const HEADER_LENGTH = PROTOCOL_V1_MESSAGE_HEADER_SIZE;

const TRANSFER_TIMEOUT_MS = 30000;
const PERMISSION_REQUEST_TIMEOUT_MS = 30000;
const PACKET_IO_MAX_RETRIES = 3;
const PACKET_IO_RETRY_DELAY = 300;
const PROTOCOL_PROBE_TIMEOUT = 5000;
const SHARED_TREZOR_PIDS = new Set([0x53c0, 0x53c1]);

/**
 * Public `path` (exposed as `connectId` by Core for USB envs) is derived from
 * the USB serial number via `resolveOneKeyUsbDevicePath`, matching WebUSB.
 * All-zero placeholder serials are kept as-is so Core's `DevicePool.canPathIdentifyDevice`
 * treats them as non-identifying; `usb-<vid4>-<pid4>-<product>` only applies when
 * the serial is empty/unreadable after permission.
 * Android `UsbDevice.getDeviceName()` is kept internal as `handle`.
 */
interface OpenDevice {
  path: string;
  handle: string;
  vendorId: number;
  productId: number;
}

function skipReportByte(packet: Uint8Array): Uint8Array {
  if (packet[0] === REPORT_ID) {
    return packet.subarray(1);
  }
  return packet;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function isSharedTrezorPidWithUnknownManufacturer(device: {
  vendorId: number;
  productId: number;
  manufacturerName?: string | null;
}): boolean {
  return (
    device.vendorId === 0x1209 &&
    SHARED_TREZOR_PIDS.has(device.productId) &&
    !device.manufacturerName?.trim()
  );
}

function matchesOneKeyDevice(device: {
  vendorId: number;
  productId: number;
  manufacturerName?: string | null;
}): boolean {
  const isOneKey = ONEKEY_WEBUSB_FILTER.some(
    f => device.vendorId === f.vendorId && device.productId === f.productId
  );
  if (!isOneKey || isKnownTrezorWebUsbDevice(device)) {
    return false;
  }
  // Trezor shares 0x1209:0x53c0 and 0x1209:0x53c1; if manufacturerName is null/unknown,
  // exclude the device rather than prompting or listing a potential Trezor.
  // OneKey-only PIDs (0x4f4a/0x4f4b/0x4f4c) are unaffected.
  if (isSharedTrezorPidWithUnknownManufacturer(device)) {
    return false;
  }
  return true;
}

export interface ReactNativeUsbTransportOptions {
  permissionRequestTimeoutMs?: number;
}

export default class ReactNativeUsbTransport extends ProtocolV2UsbTransportBase<string> {
  messages: ReturnType<typeof transport.parseConfigure> | undefined;

  messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  private protocolV2SchemaSource: string | undefined;

  name = 'ReactNativeUsbTransport';

  version = '';

  configured = false;

  isOutdated = false;

  Log?: { debug?: (...args: unknown[]) => void; error?: (...args: unknown[]) => void };

  emitter?: EventEmitter;

  private openDevices = new Map<string, OpenDevice>();

  private pathToHandle = new Map<string, string>();

  private handleToPath = new Map<string, string>();

  // Retains path for handles that disappeared from getDevices() until their detach broadcast is processed.
  private vanishedHandleToPath = new Map<string, string>();

  private deniedHandles = new Set<string>();

  private permissionRequests = new Map<string, Promise<boolean>>();

  private permissionTimeouts = new Map<string, () => void>();

  // In-flight native requestPermission Promises, kept until they settle even after the JS timeout.
  // JS cannot dismiss the Android system dialog; starting another request would stack dialogs.
  // Kotlin promises stay until the permission broadcast, detach, or invalidate().
  private nativePermissionFlight:
    | { handle: string; promise: Promise<void>; settle: () => void }
    | undefined;

  private pathResolutionLocks = new Map<string, Promise<NativeUsbDeviceInfo>>();

  private deviceProtocol: Map<string, ProtocolType> = new Map();

  private reconnectLocks = new Map<string, Promise<OpenDevice>>();

  private cancelled = false;

  private nativeEventEmitter: NativeEventEmitter | null = null;

  private nativeSubscriptions: EmitterSubscription[] = [];

  private priorityMode = false;

  protected readonly permissionRequestTimeoutMs: number;

  constructor(options?: ReactNativeUsbTransportOptions) {
    super({
      router: PROTOCOL_V2_CHANNEL_USB,
      maxFrameBytes: PROTOCOL_V2_FRAME_MAX_BYTES,
      logPrefix: 'ProtocolV2 ReactNativeUSB',
    });
    this.permissionRequestTimeoutMs =
      options?.permissionRequestTimeoutMs ?? PERMISSION_REQUEST_TIMEOUT_MS;
  }

  init(logger: ReactNativeUsbTransport['Log'], emitter?: EventEmitter) {
    this.Log = logger;
    this.emitter = emitter;
    this.subscribeNativeEvents();
    return Promise.resolve('');
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this.messages = messages;
    return Promise.resolve();
  }

  configureProtocolV2(signedData: any) {
    const schemaSource =
      typeof signedData === 'string'
        ? signedData
        : JSON.stringify(signedData) ?? String(signedData);
    if (schemaSource === this.protocolV2SchemaSource) return;

    const hadProtocolV2Schema = this.protocolV2SchemaSource !== undefined;
    this.messagesV2 = parseConfigure(signedData);
    this.protocolV2SchemaSource = schemaSource;
    if (!hadProtocolV2Schema) return;

    this.invalidateAllProtocolV2UsbLinks('Protocol V2 schema reconfigured').catch(error =>
      this.Log?.debug?.('[ReactNativeUsbTransport] schema link cleanup failed:', error)
    );
  }

  listen() {
    this.subscribeNativeEvents();
  }

  private subscribeNativeEvents() {
    this.clearNativeSubscriptions();
    this.nativeEventEmitter = createUsbEventEmitter();
    this.nativeSubscriptions = subscribeUsbDeviceEvents(this.nativeEventEmitter, {
      onAttached: device => {
        if (!matchesOneKeyDevice(device)) {
          return;
        }
        this.deniedHandles.delete(device.handle);
        if (device.serialNumber?.trim() || device.hasPermission === true) {
          const path = resolveOneKeyUsbDevicePath(device);
          if (path) {
            this.registerDeviceMapping(path, device.handle);
          }
        }
        this.Log?.debug?.('[ReactNativeUsbTransport] USB device attached');
      },
      onDetached: device => {
        const isTrackedHandle =
          this.handleToPath.has(device.handle) ||
          this.vanishedHandleToPath.has(device.handle) ||
          this.deniedHandles.has(device.handle) ||
          this.permissionRequests.has(device.handle) ||
          Array.from(this.openDevices.values()).some(d => d.handle === device.handle);
        if (!isTrackedHandle && !matchesOneKeyDevice(device)) {
          return;
        }
        this.handleDeviceDetached(device).catch(error =>
          this.Log?.debug?.('[ReactNativeUsbTransport] detach cleanup failed:', error)
        );
      },
    });
  }

  async stop(): Promise<void> {
    this.cancelled = true;
    this.priorityMode = false;
    setUsbPriorityMode(false).catch(() => undefined);
    this.clearNativeSubscriptions();

    this.permissionTimeouts.forEach(cancel => cancel());
    this.permissionTimeouts.clear();

    // Unblock acquire waiters sitting on a leftover native dialog. Do not cancel the
    // Kotlin permission Promise on JS timeout (that would allow a second dialog while
    // the first is still on screen); only release the JS waiter on stop().
    if (this.nativePermissionFlight) {
      const flight = this.nativePermissionFlight;
      this.nativePermissionFlight = undefined;
      flight.settle();
    }

    try {
      await this.disposeProtocolV2UsbLinks('React Native USB transport stopped');
    } catch (error) {
      this.Log?.debug?.('[ReactNativeUsbTransport] stop link cleanup failed:', error);
    }

    await Promise.allSettled(this.reconnectLocks.values());
    await Promise.allSettled(this.pathResolutionLocks.values());
    await Promise.all(Array.from(this.openDevices.keys(), p => this.closeOpenDevice(p)));

    this.reconnectLocks.clear();
    this.deviceProtocol.clear();
    this.pathToHandle.clear();
    this.handleToPath.clear();
    this.vanishedHandleToPath.clear();
    this.deniedHandles.clear();
    this.permissionRequests.clear();
    this.pathResolutionLocks.clear();
  }

  async post(path: string, name: string, data: Record<string, unknown>): Promise<void> {
    if (!this.messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    if (this.deviceProtocol.get(path) === 'V2') {
      await this.sendProtocolV2UsbFlowControl(path, name, data);
      return;
    }
    const encodeBuffers = ProtocolV1.encodeMessageChunks(this.messages, name, data);
    await this.sendAllChunksWithRetry(path, encodeBuffers);
  }

  async read(path: string) {
    const resData = await this.receiveData(path, this.getOpenDevice(path));
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    if (!this.messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    return ProtocolV1.decodeMessage(this.messages, resData);
  }

  async enumerate(): Promise<OneKeyDeviceInfo[]> {
    if (!isNativeUsbAvailable()) {
      return [];
    }

    try {
      const initialDevices = await this.getOneKeyDevices();
      this.refreshDeviceMappings(initialDevices);

      const devicesNeedingPermission = initialDevices.filter(
        d => !d.hasPermission && !this.deniedHandles.has(d.handle)
      );

      let finalDevices = initialDevices;
      if (devicesNeedingPermission.length > 0) {
        // Intentional divergence from WebUSB (where the app calls navigator.usb.requestDevice()):
        // Android 10+ restricts UsbDevice.getSerialNumber() until USB permission is granted, so
        // an unpermitted device cannot be listed under a stable serial-based connectId.
        // Prompt ONE device at a time (sequentially, never stacked dialogs) and skip deniedHandles.
        // Apps declaring the USB_DEVICE_ATTACHED intent filter receive pre-granted permission so
        // no dialog appears during enumerate().
        for (const d of devicesNeedingPermission) {
          if (!this.deniedHandles.has(d.handle)) {
            // After a JS timeout the native dialog may still be up; do not start a
            // prompt for a *different* handle (that would stack system dialogs).
            // Concurrent enumerate of the same handle still awaits the shared JS promise.
            if (
              this.hasOutstandingNativePermission() &&
              this.nativePermissionFlight?.handle !== d.handle &&
              !this.permissionRequests.has(d.handle)
            ) {
              break;
            }
            try {
              await this.requestPermissionForHandle(d.handle);
            } catch (error) {
              this.Log?.debug?.(
                `[ReactNativeUsbTransport] requestPermission failed for handle=${d.handle}:`,
                error
              );
            }
          }
        }
        finalDevices = await this.getOneKeyDevices();
        this.refreshDeviceMappings(finalDevices);
      }

      return finalDevices.flatMap(d => {
        if (!d.hasPermission) {
          this.Log?.debug?.(
            `[ReactNativeUsbTransport] skipping unauthorized USB device handle=${d.handle}`
          );
          return [];
        }
        const path = resolveOneKeyUsbDevicePath(d);
        if (!path) {
          return [];
        }
        this.registerDeviceMapping(path, d.handle);
        return [
          {
            path,
            id: path,
            name: 'OneKey',
            commType: 'usb' as const,
            debug: false,
          },
        ];
      });
    } catch (error) {
      this.Log?.debug?.('[ReactNativeUsbTransport] enumerate failed:', error);
      return [];
    }
  }

  async acquire(input: AcquireInput): Promise<string> {
    this.cancelled = false;

    const path = input.path ?? '';
    if (!path) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, 'No device path provided');
    }
    if (!isNativeUsbAvailable()) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Android USB host is not available on this platform. iOS has no general USB host API.'
      );
    }

    try {
      await this.rotateProtocolV2UsbGeneration(path, 'React Native USB transport acquired');
      await this.closeOpenDevice(path);
      const nativeDevice = await this.resolveDeviceForAcquire(path);
      if (this.cancelled) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside, 'Cancelled');
      }
      await this.openDevice(path, nativeDevice);
      const openDev = this.getOpenDevice(path);
      const protocolHint = input.expectedProtocol
        ? undefined
        : input.protocolHint ?? inferProtocolHintFromUsbId(openDev.vendorId, openDev.productId);
      await this.detectProtocol(path, input.expectedProtocol, protocolHint);
      return path;
    } catch (error: unknown) {
      this.Log?.debug?.('ReactNativeUsbTransport acquire error: ', error);
      try {
        await this.release(path);
      } catch (cleanupError) {
        this.Log?.debug?.('ReactNativeUsbTransport acquire cleanup error: ', cleanupError);
      }
      if (
        error instanceof Error &&
        'errorCode' in error &&
        (error.errorCode === HardwareErrorCode.TransportProtocolProbeFailed ||
          error.errorCode === HardwareErrorCode.TransportProtocolMismatch ||
          error.errorCode === HardwareErrorCode.WebUsbDeviceAccessError ||
          error.errorCode === HardwareErrorCode.RuntimeError)
      ) {
        throw error;
      }
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? error)
          : String(error);
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, message);
    }
  }

  async release(path: string, _onclose?: boolean): Promise<void> {
    await this.nativeCancel(path);
    await this.invalidateProtocolV2UsbLink(path, 'React Native USB transport released');
    await this.closeOpenDevice(path);
    this.deviceProtocol.delete(path);
  }

  async call(
    path: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    this.cancelled = false;

    if (!this.messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    if (!this.openDevices.get(path)) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device not acquired: ${path}`);
    }

    const protocol = this.deviceProtocol.get(path);
    if (!protocol) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Device protocol has not been detected for ${path}`
      );
    }
    if (protocol === 'V2') {
      return this.callProtocolV2(path, name, data, options);
    }

    return this.callProtocolV1(path, name, data, options);
  }

  cancel() {
    this.cancelled = true;
    this.openDevices.forEach((dev, path) => {
      this.nativeCancel(path, dev.handle).catch(() => undefined);
    });
  }

  getProtocolType(path: string): ProtocolType | undefined {
    return this.deviceProtocol.get(path);
  }

  setPriorityMode(enabled: boolean): Promise<void> {
    this.priorityMode = enabled;
    return setUsbPriorityMode(enabled);
  }

  getPriorityMode(): boolean {
    return this.priorityMode;
  }

  getPathForCurrentHandle(handle: string): string | undefined {
    const path = this.handleToPath.get(handle) ?? this.vanishedHandleToPath.get(handle);
    if (!path) {
      return undefined;
    }
    const currentHandle = this.pathToHandle.get(path);
    if (currentHandle && currentHandle !== handle) {
      return undefined;
    }
    return path;
  }

  isSupersededHandle(handle: string): boolean {
    const path = this.handleToPath.get(handle) ?? this.vanishedHandleToPath.get(handle);
    if (!path) {
      return false;
    }
    const currentHandle = this.pathToHandle.get(path);
    return Boolean(currentHandle && currentHandle !== handle);
  }

  hasKnownDevice(): boolean {
    return this.openDevices.size > 0 || this.pathToHandle.size > 0 || this.deviceProtocol.size > 0;
  }

  private async callProtocolV1(
    path: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    const { messages } = this;
    if (!messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    const encodeBuffers = ProtocolV1.encodeMessageChunks(messages, name, data);
    await this.sendAllChunksWithRetry(path, encodeBuffers);
    const resData = await this.receiveData(path, this.getOpenDevice(path), options?.timeoutMs);
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    const jsonData = ProtocolV1.decodeMessage(messages, resData);
    return check.call(jsonData);
  }

  private getOpenDevice(path: string): OpenDevice {
    const dev = this.openDevices.get(path);
    if (!dev) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device not acquired: ${path}`);
    }
    return dev;
  }

  private getErrorMessage(error: unknown): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && 'message' in error) {
      const { message } = error as { message?: unknown };
      return typeof message === 'string' ? message : String(message ?? '');
    }
    return String(error);
  }

  private isRetryableError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'errorCode' in error) {
      const { errorCode } = error as { errorCode?: unknown };
      if (
        errorCode === HardwareErrorCode.DeviceInterruptedFromOutside ||
        errorCode === HardwareErrorCode.DeviceNotFound ||
        errorCode === HardwareErrorCode.WebUsbDeviceAccessError ||
        errorCode === HardwareErrorCode.RuntimeError
      ) {
        return false;
      }
    }
    const message = this.getErrorMessage(error).toLowerCase();
    if (
      message.includes('cancelled') ||
      message.includes('canceled') ||
      message.includes('permission') ||
      message.includes('timeout') ||
      message.includes('timed_out') ||
      message.includes('disconnected') ||
      message.includes('device not found')
    ) {
      return false;
    }
    return (
      message.includes('transfer') ||
      message.includes('busy') ||
      message.includes('pipe') ||
      message.includes('empty usb transfer') ||
      message.includes('network') ||
      message.includes('interrupt')
    );
  }

  private isUsbTransferTimeout(error: unknown): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    return message.includes('timeout') || message.includes('timed_out');
  }

  private registerDeviceMapping(path: string, handle: string) {
    this.vanishedHandleToPath.delete(handle);
    const previousHandle = this.pathToHandle.get(path);
    if (previousHandle && previousHandle !== handle) {
      this.handleToPath.delete(previousHandle);
      this.vanishedHandleToPath.set(previousHandle, path);
    }
    const previousPath = this.handleToPath.get(handle);
    if (previousPath && previousPath !== path) {
      this.pathToHandle.delete(previousPath);
    }
    this.pathToHandle.set(path, handle);
    this.handleToPath.set(handle, path);
  }

  private async getOneKeyDevices(): Promise<NativeUsbDeviceInfo[]> {
    const native = getOneKeyUsbModule();
    const devices = await native.getDevices();
    return devices.filter(d => {
      if (isSharedTrezorPidWithUnknownManufacturer(d)) {
        this.Log?.debug?.(
          `[ReactNativeUsbTransport] skipping device on shared 0x1209:${d.productId.toString(
            16
          )} PID with unknown manufacturerName handle=${d.handle}`
        );
        return false;
      }
      return matchesOneKeyDevice(d);
    });
  }

  private refreshDeviceMappings(devices: NativeUsbDeviceInfo[]) {
    const activeHandles = new Set(devices.map(d => d.handle));

    this.deniedHandles.forEach(handle => {
      if (!activeHandles.has(handle)) {
        this.deniedHandles.delete(handle);
      }
    });

    this.handleToPath.forEach((path, handle) => {
      if (!activeHandles.has(handle)) {
        this.vanishedHandleToPath.set(handle, path);
      }
    });
    activeHandles.forEach(handle => {
      this.vanishedHandleToPath.delete(handle);
    });

    this.pathToHandle.clear();
    this.handleToPath.clear();

    devices.forEach(device => {
      if (device.hasPermission) {
        this.deniedHandles.delete(device.handle);
        const path = resolveOneKeyUsbDevicePath(device);
        if (path) {
          this.registerDeviceMapping(path, device.handle);
        }
      } else if (device.serialNumber?.trim()) {
        const path = resolveOneKeyUsbDevicePath(device);
        if (path) {
          this.registerDeviceMapping(path, device.handle);
        }
      }
    });
  }

  private hasOutstandingNativePermission(): boolean {
    return this.nativePermissionFlight != null;
  }

  private async awaitNativePermissionIdle(): Promise<void> {
    while (this.nativePermissionFlight && !this.cancelled) {
      await this.nativePermissionFlight.promise;
    }
  }

  private trackNativePermissionFlight(handle: string, nativePromise: Promise<unknown>): void {
    let settle!: () => void;
    const promise = new Promise<void>(resolve => {
      settle = resolve;
    });
    this.nativePermissionFlight = { handle, promise, settle };
    const finish = () => {
      if (this.nativePermissionFlight?.promise === promise) {
        this.nativePermissionFlight = undefined;
      }
      settle();
    };
    nativePromise.then(finish, finish);
  }

  private requestPermissionForHandle(handle: string): Promise<boolean> {
    const existing = this.permissionRequests.get(handle);
    if (existing) {
      return existing;
    }

    const native = getOneKeyUsbModule();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const cleanup = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      this.permissionTimeouts.delete(handle);
    };

    const requestPromise = new Promise<boolean>((resolve, reject) => {
      const cancelForStop = () => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        if (this.permissionRequests.get(handle) === requestPromise) {
          this.permissionRequests.delete(handle);
        }
        resolve(false);
      };
      this.permissionTimeouts.set(handle, cancelForStop);

      timer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        this.deniedHandles.add(handle);
        this.Log?.debug?.(
          `[ReactNativeUsbTransport] USB permission request timed out after ${this.permissionRequestTimeoutMs}ms for handle=${handle}`
        );
        if (this.permissionRequests.get(handle) === requestPromise) {
          this.permissionRequests.delete(handle);
        }
        resolve(false);
      }, this.permissionRequestTimeoutMs);

      const nativePromise = native.requestPermission(handle);
      this.trackNativePermissionFlight(handle, nativePromise);
      nativePromise.then(
        granted => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          if (granted) {
            this.deniedHandles.delete(handle);
          } else {
            this.deniedHandles.add(handle);
            this.Log?.debug?.(
              `[ReactNativeUsbTransport] USB permission denied for handle=${handle}`
            );
          }
          resolve(granted);
        },
        error => {
          if (settled) {
            // Ignore late rejections from a timed-out or stopped request.
            return;
          }
          settled = true;
          cleanup();
          reject(error);
        }
      );
    }).finally(() => {
      cleanup();
      if (this.permissionRequests.get(handle) === requestPromise) {
        this.permissionRequests.delete(handle);
      }
    });

    this.permissionRequests.set(handle, requestPromise);
    return requestPromise;
  }

  private async ensurePermissionForHandle(handle: string): Promise<boolean> {
    const native = getOneKeyUsbModule();
    let granted = false;
    try {
      granted = await native.hasPermission(handle);
    } catch (error) {
      mapNativeUsbError(error);
    }
    if (granted) {
      return false;
    }
    let requested = false;
    try {
      requested = await this.requestPermissionForHandle(handle);
    } catch (error) {
      mapNativeUsbError(error);
    }
    if (!requested) {
      throw ERRORS.TypedError(HardwareErrorCode.WebUsbDeviceAccessError, 'USB permission denied');
    }
    return true;
  }

  private resolveDeviceForAcquire(path: string): Promise<NativeUsbDeviceInfo> {
    const existing = this.pathResolutionLocks.get(path);
    if (existing) {
      return existing;
    }
    const resolutionPromise = this.resolveDeviceForAcquireInternal(path).finally(() => {
      if (this.pathResolutionLocks.get(path) === resolutionPromise) {
        this.pathResolutionLocks.delete(path);
      }
    });
    this.pathResolutionLocks.set(path, resolutionPromise);
    return resolutionPromise;
  }

  private findPermittedDeviceForPath(devices: NativeUsbDeviceInfo[], path: string) {
    const mappedHandle = this.pathToHandle.get(path);
    const matched = mappedHandle
      ? devices.find(d => d.handle === mappedHandle && d.hasPermission)
      : undefined;
    if (matched) {
      return matched;
    }
    return devices.find(d => d.hasPermission && resolveOneKeyUsbDevicePath(d) === path);
  }

  private async resolveDeviceForAcquireInternal(path: string): Promise<NativeUsbDeviceInfo> {
    let devices = await this.getOneKeyDevices();
    this.refreshDeviceMappings(devices);

    const mappedHandle = this.pathToHandle.get(path);
    const matched = mappedHandle ? devices.find(d => d.handle === mappedHandle) : undefined;

    if (matched) {
      const newlyGranted = await this.ensurePermissionForHandle(matched.handle);
      if (!newlyGranted && matched.hasPermission) {
        return matched;
      }
      devices = await this.getOneKeyDevices();
      this.refreshDeviceMappings(devices);
      const refreshedHandle = this.pathToHandle.get(path);
      const refreshed = refreshedHandle
        ? devices.find(d => d.handle === refreshedHandle)
        : undefined;
      if (!refreshed) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device not found: ${path}`);
      }
      return refreshed;
    }

    const candidates = devices.filter(d => {
      if (d.hasPermission || this.deniedHandles.has(d.handle)) {
        return false;
      }
      const mappedPath = this.handleToPath.get(d.handle);
      return !mappedPath || mappedPath === path;
    });
    if (candidates.length === 0) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device not found: ${path}`);
    }

    let sawPermissionDenied = false;
    for (const candidate of candidates) {
      // Wait for a timed-out native dialog to settle before prompting the next candidate.
      await this.awaitNativePermissionIdle();
      if (this.cancelled) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside, 'Cancelled');
      }
      devices = await this.getOneKeyDevices();
      this.refreshDeviceMappings(devices);
      const alreadyMatched = this.findPermittedDeviceForPath(devices, path);
      if (alreadyMatched) {
        return alreadyMatched;
      }

      const existingMappedPath = this.handleToPath.get(candidate.handle);
      if (
        !this.deniedHandles.has(candidate.handle) &&
        (!existingMappedPath || existingMappedPath === path)
      ) {
        let candidateHasPermission = false;
        try {
          await this.ensurePermissionForHandle(candidate.handle);
          candidateHasPermission = true;
        } catch (error) {
          const errorCode =
            error && typeof error === 'object' && 'errorCode' in error
              ? (error as { errorCode?: unknown }).errorCode
              : undefined;
          if (errorCode === HardwareErrorCode.WebUsbDeviceAccessError) {
            sawPermissionDenied = true;
          } else if (errorCode !== HardwareErrorCode.DeviceNotFound) {
            throw error;
          }
        }

        if (candidateHasPermission) {
          devices = await this.getOneKeyDevices();
          this.refreshDeviceMappings(devices);
          const resolvedMatch = this.findPermittedDeviceForPath(devices, path);
          if (resolvedMatch) {
            return resolvedMatch;
          }
        }
      }
    }

    if (sawPermissionDenied) {
      throw ERRORS.TypedError(HardwareErrorCode.WebUsbDeviceAccessError, 'USB permission denied');
    }
    throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device not found: ${path}`);
  }

  private async openDevice(path: string, nativeDevice: NativeUsbDeviceInfo): Promise<void> {
    if (this.cancelled) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside, 'Cancelled');
    }
    const existing = this.openDevices.get(path);
    if (existing && existing.handle === nativeDevice.handle) return;
    if (existing && existing.handle !== nativeDevice.handle) {
      await this.closeOpenDevice(path, existing.handle);
    }

    const { handle, vendorId, productId } = nativeDevice;
    const native = getOneKeyUsbModule();
    try {
      await native.open(handle);
    } catch (error) {
      mapNativeUsbError(error);
    }

    await this.drainStaleInput(handle);
    this.openDevices.set(path, { path, handle, vendorId, productId });
  }

  private async closeOpenDevice(path: string, expectedHandle?: string): Promise<void> {
    const openDev = this.openDevices.get(path);
    if (expectedHandle && openDev && openDev.handle !== expectedHandle) {
      if (isNativeUsbAvailable()) {
        try {
          await getOneKeyUsbModule().close(expectedHandle);
        } catch {
          /* ignore close errors during cleanup */
        }
      }
      return;
    }

    const handle = openDev?.handle ?? expectedHandle ?? this.pathToHandle.get(path);
    if (!openDev && !isNativeUsbAvailable()) {
      return;
    }
    this.openDevices.delete(path);
    if (!isNativeUsbAvailable() || !handle) {
      return;
    }
    try {
      await getOneKeyUsbModule().close(handle);
    } catch {
      /* ignore close errors during cleanup */
    }
  }

  private async nativeCancelByHandle(handle: string): Promise<void> {
    if (!isNativeUsbAvailable()) {
      return;
    }
    try {
      await getOneKeyUsbModule().cancel(handle);
    } catch {
      /* ignore */
    }
  }

  private async nativeCancel(path: string, explicitHandle?: string): Promise<void> {
    const handle =
      explicitHandle ?? this.openDevices.get(path)?.handle ?? this.pathToHandle.get(path);
    if (!handle) {
      return;
    }
    await this.nativeCancelByHandle(handle);
  }

  private async handleDeviceDetached(device: NativeUsbDeviceEvent): Promise<void> {
    const { handle } = device;
    this.deniedHandles.delete(handle);

    const mappedPath = this.handleToPath.get(handle) ?? this.vanishedHandleToPath.get(handle);
    const serialPath = device.serialNumber?.trim() ? resolveOneKeyUsbDevicePath(device) : undefined;
    const path = mappedPath ?? serialPath;
    this.handleToPath.delete(handle);
    this.vanishedHandleToPath.delete(handle);

    await this.nativeCancelByHandle(handle);

    if (!path) {
      return;
    }

    const openDev = this.openDevices.get(path);
    const currentHandle = this.pathToHandle.get(path);
    if (currentHandle && currentHandle !== handle) {
      if (openDev && openDev.handle === handle) {
        await this.invalidateProtocolV2UsbLink(path, 'USB device detached');
        await this.closeOpenDevice(path, handle);
        this.deviceProtocol.delete(path);
      }
      return;
    }
    if (currentHandle === handle) {
      this.pathToHandle.delete(path);
    }

    await this.invalidateProtocolV2UsbLink(path, 'USB device detached');
    await this.closeOpenDevice(path, handle);
    this.deviceProtocol.delete(path);
    this.emitter?.emit(TRANSPORT_EVENT.DEVICE_DISCONNECT, {
      name: device.productName?.trim() || '',
      id: path,
      connectId: path,
    });
  }

  private clearNativeSubscriptions() {
    this.nativeSubscriptions.forEach(sub => {
      sub.remove();
    });
    this.nativeSubscriptions = [];
    this.nativeEventEmitter = null;
  }

  private reconnectForRetry(
    path: string,
    direction: 'in' | 'out',
    attempt: number,
    error: unknown
  ): Promise<OpenDevice> {
    const existing = this.reconnectLocks.get(path);
    if (existing) return existing;

    const doReconnect = async (): Promise<OpenDevice> => {
      this.Log?.debug?.(
        `[ReactNativeUsbTransport] transfer${direction} failed, retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
          error
        )}`
      );
      await wait(attempt * PACKET_IO_RETRY_DELAY);

      await this.rotateProtocolV2UsbGeneration(
        path,
        `React Native USB Protocol V1 ${direction} reconnect attempt ${attempt}`
      );
      try {
        await this.closeOpenDevice(path);
      } catch (releaseError) {
        this.Log?.debug?.('[ReactNativeUsbTransport] release before retry error:', releaseError);
      }

      const nativeDevice = await this.resolveDeviceForAcquire(path);
      await this.openDevice(path, nativeDevice);

      const openDev = this.openDevices.get(path);
      if (!openDev) {
        throw ERRORS.TypedError(
          HardwareErrorCode.DeviceNotFound,
          `Device not found after reconnect: ${path}`
        );
      }
      return openDev;
    };

    const promise = doReconnect().finally(() => {
      this.reconnectLocks.delete(path);
    });
    this.reconnectLocks.set(path, promise);
    return promise;
  }

  private async sendAllChunksWithRetry(path: string, encodeBuffers: ArrayBuffer[]): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PACKET_IO_MAX_RETRIES; attempt++) {
      if (this.cancelled) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside, 'Cancelled');
      }
      try {
        for (const buffer of encodeBuffers) {
          const packet = new Uint8Array(PACKET_SIZE);
          packet[0] = REPORT_ID;
          packet.set(new Uint8Array(buffer), 1);
          await this.transferOutOnce(path, packet);
        }
        return;
      } catch (error) {
        lastError = error;
        const shouldRetry = attempt < PACKET_IO_MAX_RETRIES && this.isRetryableError(error);
        if (!shouldRetry) {
          throw error;
        }
        try {
          await this.reconnectForRetry(path, 'out', attempt, error);
        } catch (reconnectError) {
          lastError = reconnectError;
          this.Log?.debug?.(
            `[ReactNativeUsbTransport] reconnect failed on send retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
              reconnectError
            )}`
          );
          break;
        }
      }
    }
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error(this.getErrorMessage(lastError));
  }

  private async transferInWithRetry(
    path: string,
    length: number,
    options?: { waitIndefinitelyOnTimeout?: boolean }
  ): Promise<Uint8Array> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PACKET_IO_MAX_RETRIES; attempt++) {
      if (this.cancelled) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside, 'Cancelled');
      }
      try {
        return await this.transferInOnce(path, length);
      } catch (error) {
        lastError = error;
        if (options?.waitIndefinitelyOnTimeout && this.isUsbTransferTimeout(error)) {
          attempt -= 1;
        } else {
          const shouldRetry = attempt < PACKET_IO_MAX_RETRIES && this.isRetryableError(error);
          if (!shouldRetry) {
            throw error;
          }
          try {
            await this.reconnectForRetry(path, 'in', attempt, error);
          } catch (reconnectError) {
            lastError = reconnectError;
            this.Log?.debug?.(
              `[ReactNativeUsbTransport] reconnect failed on retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
                reconnectError
              )}`
            );
            break;
          }
        }
      }
    }
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error(this.getErrorMessage(lastError));
  }

  private async transferInByHandle(
    handle: string,
    length: number,
    timeoutMs = TRANSFER_TIMEOUT_MS
  ): Promise<Uint8Array> {
    try {
      const encoded = await getOneKeyUsbModule().transferIn(handle, length, timeoutMs);
      const packet = decodeUsbPacket(encoded);
      if (packet.byteLength <= 0) {
        throw new Error('Empty USB transfer');
      }
      return packet;
    } catch (error) {
      if (error && typeof error === 'object' && 'errorCode' in error) {
        throw error;
      }
      mapNativeUsbError(error);
    }
  }

  private transferInOnce(
    path: string,
    length: number,
    timeoutMs = TRANSFER_TIMEOUT_MS
  ): Promise<Uint8Array> {
    const { handle } = this.getOpenDevice(path);
    return this.transferInByHandle(handle, length, timeoutMs);
  }

  private async transferOutOnce(path: string, data: Uint8Array): Promise<void> {
    const { handle } = this.getOpenDevice(path);
    try {
      await getOneKeyUsbModule().transferOut(handle, encodeUsbPacket(data), TRANSFER_TIMEOUT_MS);
    } catch (error) {
      if (error && typeof error === 'object' && 'errorCode' in error) {
        throw error;
      }
      mapNativeUsbError(error);
    }
  }

  private async drainStaleInput(handle: string): Promise<void> {
    for (let index = 0; index < 16; index += 1) {
      try {
        await this.transferInByHandle(handle, PACKET_SIZE, 50);
      } catch {
        break;
      }
    }
  }

  private createProtocolMismatchError(expected: ProtocolType) {
    return ERRORS.TypedError(HardwareErrorCode.TransportProtocolProbeFailed, undefined, {
      expectedProtocol: expected,
    });
  }

  private createProtocolDetectionError() {
    return ERRORS.TypedError(HardwareErrorCode.TransportProtocolProbeFailed);
  }

  private async detectProtocol(
    path: string,
    expectedProtocol?: ProtocolType,
    protocolHint?: ProtocolType
  ): Promise<ProtocolType> {
    if (expectedProtocol === 'V2') {
      if (await this.probeProtocolV2(path)) {
        this.deviceProtocol.set(path, 'V2');
        this.Log?.debug?.(
          `[ReactNativeUsbTransport] detectProtocol: path=${path} -> V2 (expected)`
        );
        return 'V2';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (expectedProtocol === 'V1') {
      if (await this.probeProtocolV1(path)) {
        this.deviceProtocol.set(path, 'V1');
        return 'V1';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    const probeOrder: ProtocolType[] =
      protocolHint === 'V2' || this.deviceProtocol.get(path) === 'V2' ? ['V2', 'V1'] : ['V1', 'V2'];

    for (const [index, protocol] of probeOrder.entries()) {
      if (index > 0) {
        await this.resetConnectionAfterProbe(path);
      }
      const detected =
        protocol === 'V1' ? await this.probeProtocolV1(path) : await this.probeProtocolV2(path);
      if (detected) {
        this.deviceProtocol.set(path, protocol);
        return protocol;
      }
    }

    this.deviceProtocol.delete(path);
    throw this.createProtocolDetectionError();
  }

  private async resetConnectionAfterProbe(path: string) {
    await this.rotateProtocolV2UsbGeneration(path, 'React Native USB protocol probe reset');

    try {
      await this.nativeCancel(path);
      await this.closeOpenDevice(path);
    } catch (error) {
      this.Log?.debug?.('[ReactNativeUsbTransport] close after protocol probe error:', error);
    }

    const nativeDevice = await this.resolveDeviceForAcquire(path);
    await this.openDevice(path, nativeDevice);
  }

  private async withProtocolReadTimeout<T>(
    path: string,
    promise: Promise<T>,
    timeoutMs: number,
    protocol: ProtocolType
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const waitForeverAfterTimeout = () => new Promise<never>(() => {});
    const guardedPromise = promise.then(
      value => (timedOut ? waitForeverAfterTimeout() : value),
      error => {
        if (timedOut) {
          return waitForeverAfterTimeout();
        }
        throw error;
      }
    );
    try {
      return await Promise.race([
        guardedPromise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(async () => {
            timedOut = true;
            try {
              await this.resetConnectionAfterProbe(path);
            } catch (error) {
              this.Log?.debug?.(
                `[ReactNativeUsbTransport] reset after Protocol ${protocol} timeout failed:`,
                error
              );
            } finally {
              reject(new Error(`Protocol ${protocol} read timeout after ${timeoutMs}ms`));
            }
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async probeProtocolV1(path: string) {
    if (!this.messages) {
      return false;
    }

    try {
      await this.callProtocolV1(path, 'Initialize', {}, { timeoutMs: PROTOCOL_PROBE_TIMEOUT });
      return true;
    } catch (_error) {
      return false;
    }
  }

  private probeProtocolV2(path: string) {
    if (!this.messages || !this.messagesV2) {
      return Promise.resolve(false);
    }

    return probeProtocolV2Helper({
      call: (name, data, options) => this.callProtocolV2(path, name, data, options),
      timeoutMs: PROTOCOL_PROBE_TIMEOUT,
      logger: this.Log,
      logPrefix: 'ProtocolV2 ReactNativeUSB',
      onProbeFailed: () => this.resetConnectionAfterProbe(path),
    });
  }

  protected getProtocolV2UsbSchemas(): ProtocolV2Schemas {
    if (!this.messages || !this.messagesV2) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    return {
      protocolV1: this.messages,
      protocolV2: this.messagesV2,
    };
  }

  protected getProtocolV2UsbLogger() {
    return this.Log;
  }

  protected async writeProtocolV2UsbPacket(
    path: string,
    frame: Uint8Array,
    _context: ProtocolV2CallContext
  ): Promise<void> {
    if (this.cancelled) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside, 'Cancelled');
    }
    await this.transferOutOnce(path, frame);
  }

  protected async readProtocolV2UsbPacket(
    path: string,
    _context: ProtocolV2CallContext
  ): Promise<Uint8Array> {
    for (;;) {
      if (this.cancelled) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside, 'Cancelled');
      }
      try {
        return await this.transferInOnce(path, PROTOCOL_V2_FRAME_MAX_BYTES);
      } catch (error) {
        if (!this.isUsbTransferTimeout(error)) {
          throw error;
        }
      }
    }
  }

  protected async resetProtocolV2UsbNativeLink(path: string, _reason: string): Promise<void> {
    await this.nativeCancel(path);
    await this.closeOpenDevice(path);
  }

  protected onProtocolV2UsbLinkInvalidated(path: string, reason: string) {
    this.deviceProtocol.delete(path);
    this.Log?.debug?.(`[ReactNativeUsbTransport] Protocol V2 link invalidated: ${path}`, reason);
  }

  protected createProtocolV2UsbTimeoutError(name: string, timeoutMs: number): Error {
    return new ProtocolV2LinkError(
      'response-timeout',
      `Protocol V2 response timeout after ${timeoutMs}ms for ${name}`
    );
  }

  private callProtocolV2(
    path: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    return this.callProtocolV2Usb(path, name, data, options);
  }

  private async receiveData(path: string, _dev: OpenDevice, timeoutMs?: number): Promise<string> {
    const deadline = timeoutMs ? Date.now() + timeoutMs : undefined;
    const readPacket = async () => {
      const transferIn = this.transferInWithRetry(path, PACKET_SIZE);
      return deadline
        ? this.withProtocolReadTimeout(path, transferIn, Math.max(deadline - Date.now(), 1), 'V1')
        : transferIn;
    };

    const firstPacket = await readPacket();
    const firstData = skipReportByte(firstPacket);
    const { length, typeId, restBuffer } = ProtocolV1.decodeFirstChunk(toArrayBuffer(firstData));

    const lengthWithHeader = Number(length) + Number(HEADER_LENGTH);
    const decoded = new ByteBuffer(lengthWithHeader);
    decoded.writeUint16(typeId);
    decoded.writeUint32(Number(length));
    if (length) {
      decoded.append(restBuffer);
    }

    while (Number(decoded.offset) < lengthWithHeader) {
      const packet = await readPacket();
      const pktData = skipReportByte(packet);
      if (pktData.byteLength === 0) {
        throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Empty USB packet payload');
      }
      const buf = toArrayBuffer(pktData);
      const remaining = lengthWithHeader - Number(decoded.offset);
      if (remaining >= PAYLOAD_SIZE) {
        decoded.append(buf);
      } else {
        decoded.append(buf.slice(0, remaining));
      }
    }

    decoded.reset();
    const result = decoded.toBuffer();
    return Buffer.from(result as unknown as ArrayBuffer).toString('hex');
  }
}

export {
  matchesOneKeyDevice as isOneKeyUsbDevice,
  ONEKEY_USB_DEVICE_ATTACHED,
  ONEKEY_USB_DEVICE_DETACHED,
  TRANSPORT_EVENT,
  createUsbEventEmitter,
  isNativeUsbAvailable,
  setUsbPriorityMode,
  subscribeUsbDeviceEvents,
};
export type { NativeUsbDeviceEvent, NativeUsbDeviceInfo };
