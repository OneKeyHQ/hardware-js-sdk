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
  wait,
} from '@onekeyfe/hd-shared';

import {
  createUsbEventEmitter,
  decodeUsbPacket,
  encodeUsbPacket,
  getOneKeyUsbModule,
  isNativeUsbAvailable,
  mapNativeUsbError,
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

const { parseConfigure, ProtocolV1, check } = transport;

const PACKET_SIZE = PROTOCOL_V1_USB_PACKET_SIZE;
const REPORT_ID = PROTOCOL_V1_REPORT_ID;
const PAYLOAD_SIZE = PROTOCOL_V1_CHUNK_PAYLOAD_SIZE;
const HEADER_LENGTH = PROTOCOL_V1_MESSAGE_HEADER_SIZE;

const TRANSFER_TIMEOUT_MS = 30000;
const PACKET_IO_MAX_RETRIES = 3;
const PACKET_IO_RETRY_DELAY = 300;
const PROTOCOL_PROBE_TIMEOUT = 5000;

/**
 * Public `path` is always the Android `UsbDevice.getDeviceName()` (`/dev/bus/usb/...`).
 * The path is stable for one plug session; re-plug yields a new path, like the
 * BLE/WebUSB reconnect flow where core re-matches by device features.
 */
interface OpenDevice {
  path: string;
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

function matchesOneKeyFilter(vendorId: number, productId: number): boolean {
  return ONEKEY_WEBUSB_FILTER.some(f => vendorId === f.vendorId && productId === f.productId);
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

  private deviceProtocol: Map<string, ProtocolType> = new Map();

  private reconnectLocks = new Map<string, Promise<OpenDevice>>();

  private cancelled = false;

  private nativeEventEmitter: NativeEventEmitter | null = null;

  private nativeSubscriptions: EmitterSubscription[] = [];

  constructor() {
    super({
      router: PROTOCOL_V2_CHANNEL_USB,
      maxFrameBytes: PROTOCOL_V2_FRAME_MAX_BYTES,
      logPrefix: 'ProtocolV2 ReactNativeUSB',
    });
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
        if (!matchesOneKeyFilter(device.vendorId, device.productId)) {
          return;
        }
        this.Log?.debug?.('[ReactNativeUsbTransport] USB device attached');
      },
      onDetached: device => {
        if (!matchesOneKeyFilter(device.vendorId, device.productId)) {
          return;
        }
        this.handleDeviceDetached(device.path).catch(error =>
          this.Log?.debug?.('[ReactNativeUsbTransport] detach cleanup failed:', error)
        );
      },
    });
  }

  async stop(): Promise<void> {
    this.cancelled = true;
    this.clearNativeSubscriptions();

    try {
      await this.disposeProtocolV2UsbLinks('React Native USB transport stopped');
    } catch (error) {
      this.Log?.debug?.('[ReactNativeUsbTransport] stop link cleanup failed:', error);
    }

    await Promise.allSettled(this.reconnectLocks.values());
    await Promise.all(Array.from(this.openDevices.keys(), p => this.closeOpenDevice(p)));

    this.reconnectLocks.clear();
    this.deviceProtocol.clear();
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
      const native = getOneKeyUsbModule();
      const devices = await native.getDevices();
      return devices
        .filter(d => matchesOneKeyFilter(d.vendorId, d.productId))
        .map(d => ({
          path: d.path,
          id: d.path,
          name: 'OneKey',
          commType: 'usb' as const,
          debug: false,
        }));
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
      await this.ensurePermission(path);
      await this.openDevice(path);
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
    this.openDevices.forEach((_dev, path) => {
      this.nativeCancel(path).catch(() => undefined);
    });
  }

  getProtocolType(path: string): ProtocolType | undefined {
    return this.deviceProtocol.get(path);
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

  private async ensurePermission(path: string): Promise<void> {
    const native = getOneKeyUsbModule();
    let granted = false;
    try {
      granted = await native.hasPermission(path);
    } catch (error) {
      mapNativeUsbError(error);
    }
    if (granted) {
      return;
    }
    let requested = false;
    try {
      requested = await native.requestPermission(path);
    } catch (error) {
      mapNativeUsbError(error);
    }
    if (!requested) {
      throw ERRORS.TypedError(HardwareErrorCode.WebUsbDeviceAccessError, 'USB permission denied');
    }
  }

  private async openDevice(path: string): Promise<void> {
    const existing = this.openDevices.get(path);
    if (existing) return;

    const native = getOneKeyUsbModule();
    try {
      await native.open(path);
    } catch (error) {
      mapNativeUsbError(error);
    }

    let vendorId = 0;
    let productId = 0;
    try {
      const devices = await native.getDevices();
      const match = devices.find(d => d.path === path);
      if (match) {
        vendorId = match.vendorId;
        productId = match.productId;
      }
    } catch {
      /* identity is optional after a successful open */
    }

    await this.drainStaleInput(path);
    this.openDevices.set(path, { path, vendorId, productId });
  }

  private async closeOpenDevice(path: string): Promise<void> {
    if (!this.openDevices.has(path) && !isNativeUsbAvailable()) {
      return;
    }
    this.openDevices.delete(path);
    if (!isNativeUsbAvailable()) {
      return;
    }
    try {
      await getOneKeyUsbModule().close(path);
    } catch {
      /* ignore close errors during cleanup */
    }
  }

  private async nativeCancel(path: string): Promise<void> {
    if (!isNativeUsbAvailable()) {
      return;
    }
    try {
      await getOneKeyUsbModule().cancel(path);
    } catch {
      /* ignore */
    }
  }

  private async handleDeviceDetached(path: string): Promise<void> {
    await this.nativeCancel(path);
    await this.invalidateProtocolV2UsbLink(path, 'USB device detached');
    await this.closeOpenDevice(path);
    this.deviceProtocol.delete(path);
    this.emitter?.emit(TRANSPORT_EVENT.DEVICE_DISCONNECT, {
      name: '',
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

      await this.enumerate();
      await this.ensurePermission(path);
      await this.openDevice(path);

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

  private async transferInOnce(
    path: string,
    length: number,
    timeoutMs = TRANSFER_TIMEOUT_MS
  ): Promise<Uint8Array> {
    try {
      const encoded = await getOneKeyUsbModule().transferIn(path, length, timeoutMs);
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

  private async transferOutOnce(path: string, data: Uint8Array): Promise<void> {
    try {
      await getOneKeyUsbModule().transferOut(path, encodeUsbPacket(data), TRANSFER_TIMEOUT_MS);
    } catch (error) {
      if (error && typeof error === 'object' && 'errorCode' in error) {
        throw error;
      }
      mapNativeUsbError(error);
    }
  }

  private async drainStaleInput(path: string): Promise<void> {
    for (let index = 0; index < 16; index += 1) {
      try {
        await this.transferInOnce(path, PACKET_SIZE, 50);
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

    await this.enumerate();
    await this.ensurePermission(path);
    await this.openDevice(path);
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
