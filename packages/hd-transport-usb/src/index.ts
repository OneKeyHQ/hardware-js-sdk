import ByteBuffer from 'bytebuffer';
import * as usb from 'usb';
import transport, {
  PROTOCOL_V1_CHUNK_PAYLOAD_SIZE,
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V1_REPORT_ID,
  PROTOCOL_V1_USB_PACKET_SIZE,
  PROTOCOL_V2_CHANNEL_USB,
  PROTOCOL_V2_FRAME_MAX_BYTES,
  ProtocolV2LinkError,
  ProtocolV2UsbTransportBase,
  probeProtocolV2 as probeProtocolV2Helper,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, ONEKEY_WEBUSB_FILTER, wait } from '@onekeyfe/hd-shared';

import { createTransportCallLog, shouldSuppressHighVolumeCallLog } from './transportLog';

import type EventEmitter from 'events';
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

/** USB interface number for vendor-specific communication */
const INTERFACE_NUMBER = 0;
/** USB endpoint addresses */
const ENDPOINT_IN = 0x81;
const ENDPOINT_OUT = 0x01;

/** Transfer timeout in milliseconds */
const TRANSFER_TIMEOUT_MS = 30000;

/** Timeout for reading serial number descriptor during enumeration */
const SERIAL_READ_TIMEOUT_MS = 5000;

/** Packet I/O retry configuration (matches WebUsbTransport) */
const PACKET_IO_MAX_RETRIES = 3;
const PACKET_IO_RETRY_DELAY = 300;
const PROTOCOL_PROBE_TIMEOUT = 5000;

/**
 * Opened device state — holds the USB device, claimed interface, and endpoints.
 */
interface OpenDevice {
  device: usb.Device;
  iface: usb.Interface;
  epIn: usb.InEndpoint;
  epOut: usb.OutEndpoint;
}

/**
 * Fallback identifier using bus topology (unstable across re-plugs).
 */
function getBusId(dev: usb.Device): string {
  return `usb:${dev.busNumber}:${dev.deviceAddress}`;
}

/**
 * Read USB string descriptor serial number from a device.
 * Opens device briefly, reads serial, then closes.
 * Falls back to bus path if serial cannot be read.
 */
function readSerialNumber(dev: usb.Device, openDevices?: Map<string, OpenDevice>): Promise<string> {
  const { iSerialNumber } = dev.deviceDescriptor;
  if (!iSerialNumber) return Promise.resolve(getBusId(dev));

  // If the device is already open (acquired), read serial without open/close
  const busId = getBusId(dev);
  if (openDevices) {
    for (const [serial, od] of openDevices) {
      if (od.device === dev || getBusId(od.device) === busId) {
        return Promise.resolve(serial);
      }
    }
  }

  return new Promise<string>(resolve => {
    let settled = false;
    const settle = (value: string) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // Guard against getStringDescriptor never calling back
    const timer = setTimeout(() => {
      try {
        dev.close();
      } catch {
        /* ignore */
      }
      settle(busId);
    }, SERIAL_READ_TIMEOUT_MS);

    try {
      dev.open();
      try {
        dev.getStringDescriptor(iSerialNumber, (_err: Error | undefined, data?: string) => {
          clearTimeout(timer);
          try {
            dev.close();
          } catch {
            /* ignore */
          }
          settle(data || busId);
        });
      } catch {
        clearTimeout(timer);
        try {
          dev.close();
        } catch {
          /* ignore */
        }
        settle(busId);
      }
    } catch {
      // dev.open() failed (e.g. LIBUSB_ERROR_BUSY if already open elsewhere)
      clearTimeout(timer);
      settle(busId);
    }
  });
}

/**
 * Skip the 0x3F protocol marker byte from a USB packet.
 */
function skipReportByte(packet: Buffer): Buffer {
  if (packet[0] === REPORT_ID) {
    return packet.subarray(1);
  }
  return packet;
}

/**
 * Convert a Buffer to ArrayBuffer (required by decodeChunked).
 */
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Node.js USB Transport — complete transport implementation using libusb.
 *
 * Unlike the old UsbPlugin (which was a LowlevelTransportSharedPlugin piped
 * through LowlevelTransport), this class is a standalone transport that handles
 * both protocol encoding/decoding and USB I/O directly.
 *
 * Modeled after WebUsbTransport.
 */
export default class NodeUsbTransport extends ProtocolV2UsbTransportBase<string> {
  messages: ReturnType<typeof transport.parseConfigure> | undefined;

  /** Protobuf schema for Protocol V2 transports. */
  messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  private protocolV2SchemaSource: string | undefined;

  name = 'NodeUsbTransport';

  version = '';

  configured = false;

  isOutdated = false;

  Log?: any;

  emitter?: EventEmitter;

  /** serial → bus id, built during enumerate */
  private serialToBusId = new Map<string, string>();

  /** path → opened device state */
  private openDevices = new Map<string, OpenDevice>();

  /** Per-path protocol type detected by active wire-level probe. */
  private deviceProtocol: Map<string, ProtocolType> = new Map();

  /** per-path reconnect lock to prevent concurrent reconnects */
  private reconnectLocks = new Map<string, Promise<OpenDevice>>();

  /**
   * Retain the low-level Transfer so release()/stop() can cancel native pending reads.
   * Endpoint.transfer() hides it and may keep the CLI alive after output completes.
   */
  private activeTransfers = new Map<
    usb.Transfer,
    { path: string; settled: Promise<void>; resolveSettled: () => void }
  >();

  /** set to true when cancel() is called; checked by retry loops */
  private cancelled = false;

  constructor() {
    super({
      router: PROTOCOL_V2_CHANNEL_USB,
      maxFrameBytes: PROTOCOL_V2_FRAME_MAX_BYTES,
      logPrefix: 'ProtocolV2 NodeUSB',
    });
  }

  /**
   * Initialize transport.
   * Signature matches the Transport.init interface (logger, emitter).
   */
  init(logger: any, emitter?: EventEmitter) {
    this.Log = logger;
    this.emitter = emitter;
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
      this.Log?.debug('[NodeUsbTransport] schema link cleanup failed:', error)
    );
  }

  listen() {
    // empty — could add hotplug events via usb.on('attach'/'detach')
  }

  async stop(): Promise<void> {
    this.cancelled = true;

    await this.cancelActiveTransfers();

    try {
      await this.disposeProtocolV2UsbLinks('Node USB transport stopped');
    } catch (error) {
      this.Log?.debug('[NodeUsbTransport] stop link cleanup failed:', error);
    }

    // Reconnect may already be in flight when dispose starts. Wait for it to
    // settle, then close every remaining handle so it cannot reopen USB after
    // the first cleanup pass.
    await Promise.allSettled(this.reconnectLocks.values());
    await this.cancelActiveTransfers();
    await Promise.all(Array.from(this.openDevices.keys(), path => this.closeOpenDevice(path)));

    this.reconnectLocks.clear();
    this.deviceProtocol.clear();
    this.serialToBusId.clear();
  }

  /**
   * Low-level post (send only, no response). Not used by NodeUsbTransport
   * since call() handles the full send+receive cycle, but required by the Transport interface.
   */
  async post(path: string, name: string, data: Record<string, unknown>): Promise<void> {
    if (!this.messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    const encodeBuffers = ProtocolV1.encodeMessageChunks(this.messages, name, data);
    await this.sendAllChunksWithRetry(path, encodeBuffers);
  }

  /**
   * Low-level read (receive only). Not used by NodeUsbTransport
   * since call() handles the full send+receive cycle, but required by the Transport interface.
   */
  async read(path: string) {
    const dev = this.getOpenDevice(path);
    const resData = await this.receiveData(path, dev);
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    if (!this.messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    return ProtocolV1.decodeMessage(this.messages, resData);
  }

  /**
   * Enumerate connected OneKey USB devices.
   * Opens each device briefly to read its serial number (used as `path`),
   * then closes it. acquire() re-opens from a fresh getDeviceList().
   */
  async enumerate(): Promise<OneKeyDeviceInfo[]> {
    const allDevices = usb.getDeviceList();

    const onekeyDevices = allDevices.filter(d => {
      const { idVendor, idProduct } = d.deviceDescriptor;
      return ONEKEY_WEBUSB_FILTER.some(f => idVendor === f.vendorId && idProduct === f.productId);
    });

    const newSerialToBusId = new Map<string, string>();
    const results: OneKeyDeviceInfo[] = [];
    for (const d of onekeyDevices) {
      const busId = getBusId(d);
      const serial = await readSerialNumber(d, this.openDevices);
      newSerialToBusId.set(serial, busId);
      results.push({
        path: serial,
        id: serial,
        name: 'OneKey',
        commType: 'usb',
        debug: false,
      });
    }
    // Atomic swap — concurrent acquire() always sees a complete map
    this.serialToBusId = newSerialToBusId;
    return results;
  }

  /**
   * Acquire device — open USB device, claim interface, return path (string).
   */
  async acquire(input: AcquireInput): Promise<string> {
    this.cancelled = false;

    const path = input.path ?? '';
    if (!path) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, 'No device path provided');
    }

    try {
      await this.rotateProtocolV2UsbGeneration(path, 'Node USB transport acquired');
      await this.closeOpenDevice(path);
      await this.openDevice(path);
      await this.detectProtocol(path, input.expectedProtocol, input.protocolHint);
      return path;
    } catch (error: any) {
      this.Log?.debug('NodeUsbTransport acquire error: ', error);
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, error.message ?? String(error));
    }
  }

  /**
   * Release device — release interface and close.
   */
  async release(path: string, _onclose?: boolean): Promise<void> {
    await this.cancelActiveTransfers(path);
    await this.invalidateProtocolV2UsbLink(path, 'Node USB transport released');
    await this.closeOpenDevice(path);
    this.deviceProtocol.delete(path);
  }

  private async cancelActiveTransfers(path?: string): Promise<void> {
    const transfers = Array.from(this.activeTransfers.entries()).filter(
      ([, active]) => path === undefined || active.path === path
    );
    transfers.forEach(([transfer]) => {
      try {
        transfer.cancel();
      } catch {
        // A transfer may finish between the snapshot and cancel().
      }
    });
    await Promise.allSettled(transfers.map(([, active]) => active.settled));
  }

  private createTrackedTransfer(
    path: string,
    endpoint: usb.InEndpoint | usb.OutEndpoint,
    callback: (error: Error | undefined, buffer: Buffer, actualLength: number) => void
  ): usb.Transfer {
    let resolveSettled: () => void = () => undefined;
    const settled = new Promise<void>(resolve => {
      resolveSettled = resolve;
    });
    const transfer = endpoint.makeTransfer(endpoint.timeout, (error, buffer, actualLength) => {
      this.activeTransfers.delete(transfer);
      resolveSettled();
      callback(error, buffer, actualLength);
    });
    this.activeTransfers.set(transfer, { path, settled, resolveSettled });
    return transfer;
  }

  private transferInOnce(path: string, ep: usb.InEndpoint, length: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.alloc(length);
      const transfer = this.createTrackedTransfer(
        path,
        ep,
        (error, _submittedBuffer, actualLength) => {
          if (error) {
            reject(error);
            return;
          }
          if (actualLength <= 0) {
            reject(new Error('Empty USB transfer'));
            return;
          }
          resolve(buffer.subarray(0, actualLength));
        }
      );
      try {
        transfer.submit(buffer);
      } catch (error) {
        const active = this.activeTransfers.get(transfer);
        this.activeTransfers.delete(transfer);
        active?.resolveSettled();
        reject(error);
      }
    });
  }

  private transferOutOnce(path: string, ep: usb.OutEndpoint, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const transfer = this.createTrackedTransfer(path, ep, error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
      try {
        transfer.submit(data);
      } catch (error) {
        const active = this.activeTransfers.get(transfer);
        this.activeTransfers.delete(transfer);
        active?.resolveSettled();
        reject(error);
      }
    });
  }

  private async closeOpenDevice(path: string): Promise<void> {
    const openDev = this.openDevices.get(path);
    if (!openDev) return;

    try {
      await new Promise<void>(resolve => {
        openDev.iface.release(() => {
          try {
            openDev.device.close();
          } catch {
            /* ignore */
          }
          resolve();
        });
      });
    } catch {
      try {
        openDev.device.close();
      } catch {
        /* ignore */
      }
    }
    this.openDevices.delete(path);
  }

  /**
   * Call device method — encode protobuf, send packets, receive response.
   * This is the core method that replaces LowlevelTransport's call + UsbPlugin's send/receive.
   */
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
    if (!shouldSuppressHighVolumeCallLog(name)) {
      this.Log?.debug('transport call', createTransportCallLog(name, protocol));
    }

    if (protocol === 'V2') {
      return this.callProtocolV2(path, name, data, options);
    }

    return this.callProtocolV1(path, name, data, options);
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
    // Encode protobuf message into 63-byte chunks (same as WebUsbTransport)
    const encodeBuffers = ProtocolV1.encodeMessageChunks(messages, name, data);

    // Send all chunks with retry — if any chunk fails and reconnects,
    // restart the entire send sequence from chunk 0 (device resets state on reconnect)
    await this.sendAllChunksWithRetry(path, encodeBuffers);

    // Receive response — re-resolve in case reconnect happened during send
    const resData = await this.receiveData(path, this.getOpenDevice(path), options?.timeoutMs);
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    const jsonData = ProtocolV1.decodeMessage(messages, resData);
    return check.call(jsonData);
  }

  cancel() {
    this.cancelled = true;
  }

  // --- Private helpers ---

  /**
   * Get the current open device for a path, re-resolving from the map
   * so callers always use a fresh reference after reconnect.
   */
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
    const message = this.getErrorMessage(error).toLowerCase();
    // cancelActiveTransfers() terminates timed-out or releasing native requests.
    // LIBUSB_TRANSFER_CANCELLED is not transient. Retrying would start another pending
    // read on the rebuilt interface and race protocol probing against release.
    if (message.includes('cancelled') || message.includes('canceled')) {
      return false;
    }
    return (
      message.includes('libusb') ||
      message.includes('transfer') ||
      message.includes('disconnected') ||
      message.includes('device not found') ||
      message.includes('busy') ||
      message.includes('pipe') ||
      message.includes('empty usb transfer') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('interrupt')
    );
  }

  private isUsbTransferTimeout(error: unknown): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    return message.includes('timeout') || message.includes('timed_out');
  }

  private getDeviceInterface(dev: usb.Device): usb.Interface {
    const { interfaces } = dev;
    if (!interfaces?.length) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, 'USB interface not found');
    }

    const vendorInterface = interfaces.find(iface => iface.descriptor.bInterfaceClass === 0xff);
    const defaultInterface = interfaces.find(
      iface => iface.descriptor.bInterfaceNumber === INTERFACE_NUMBER
    );
    const iface = vendorInterface ?? defaultInterface ?? interfaces[0];

    return iface;
  }

  /**
   * Reconnect device before retrying a failed transfer (aligned with WebUsbTransport).
   * Uses per-path lock to prevent concurrent reconnects to the same device.
   */
  private reconnectForRetry(
    path: string,
    direction: 'in' | 'out',
    attempt: number,
    error: unknown
  ): Promise<OpenDevice> {
    // If a reconnect is already in progress for this path, reuse it
    const existing = this.reconnectLocks.get(path);
    if (existing) return existing;

    const doReconnect = async (): Promise<OpenDevice> => {
      this.Log?.debug(
        `[NodeUsbTransport] transfer${direction} failed, retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
          error
        )}`
      );
      await wait(attempt * PACKET_IO_RETRY_DELAY);

      await this.rotateProtocolV2UsbGeneration(
        path,
        `Node USB Protocol V1 ${direction} reconnect attempt ${attempt}`
      );
      // Close the existing device without clearing the detected protocol cache.
      try {
        await this.closeOpenDevice(path);
      } catch (releaseError) {
        this.Log?.debug('[NodeUsbTransport] release before retry error:', releaseError);
      }

      // Re-enumerate to refresh device list, then re-open
      await this.enumerate();
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

  /**
   * Send all encoded chunks to the device with retry.
   * If a chunk fails and triggers reconnect, the entire sequence restarts
   * from chunk 0 because the device resets protocol state on reconnect.
   */
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
          await this.transferOutOnce(path, this.getOpenDevice(path).epOut, Buffer.from(packet));
        }
        return; // all chunks sent successfully
      } catch (error) {
        lastError = error;
        const shouldRetry = attempt < PACKET_IO_MAX_RETRIES && this.isRetryableError(error);
        if (!shouldRetry) {
          throw error;
        }
        try {
          await this.reconnectForRetry(path, 'out', attempt, error);
          // Reconnected — loop will restart from chunk 0
        } catch (reconnectError) {
          lastError = reconnectError;
          this.Log?.debug(
            `[NodeUsbTransport] reconnect failed on send retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
              reconnectError
            )}`
          );
          // Reconnect failed — no point retrying with a dead device
          break;
        }
      }
    }
    throw lastError;
  }

  /**
   * USB IN transfer with retry and reconnect (aligned with WebUsbTransport).
   */
  private async transferInWithRetry(
    path: string,
    openDev: OpenDevice,
    length: number,
    options?: { waitIndefinitelyOnTimeout?: boolean }
  ): Promise<Buffer> {
    let lastError: unknown;
    let currentDev = openDev;
    for (let attempt = 1; attempt <= PACKET_IO_MAX_RETRIES; attempt++) {
      if (this.cancelled) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside, 'Cancelled');
      }
      try {
        return await this.transferInOnce(path, currentDev.epIn, length);
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
            currentDev = await this.reconnectForRetry(path, 'in', attempt, error);
          } catch (reconnectError) {
            lastError = reconnectError;
            this.Log?.debug(
              `[NodeUsbTransport] reconnect failed on retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
                reconnectError
              )}`
            );
            break;
          }
        }
      }
    }
    throw lastError;
  }

  /**
   * Open a USB device by path (serial number), claim interface, cache endpoints.
   */
  private async openDevice(path: string): Promise<void> {
    const existing = this.openDevices.get(path);
    if (existing) return;

    // Resolve serial → bus id, then find a fresh device object
    const busId = this.serialToBusId.get(path) ?? path;
    const allDevices = usb.getDeviceList();
    const dev = allDevices.find(d => getBusId(d) === busId);
    if (!dev) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `USB device not found: ${path}`);
    }

    try {
      dev.open();
      dev.timeout = TRANSFER_TIMEOUT_MS;

      const iface = this.getDeviceInterface(dev);

      // On Linux, detach kernel driver if active
      if (process.platform === 'linux') {
        try {
          if (iface.isKernelDriverActive()) {
            iface.detachKernelDriver();
          }
        } catch {
          // May not be supported — continue
        }
      }

      iface.claim();

      const epIn =
        iface.endpoints.find(
          (e): e is usb.InEndpoint => e.direction === 'in' && e.address === ENDPOINT_IN
        ) ?? iface.endpoints.find((e): e is usb.InEndpoint => e.direction === 'in');
      const epOut =
        iface.endpoints.find(
          (e): e is usb.OutEndpoint => e.direction === 'out' && e.address === ENDPOINT_OUT
        ) ?? iface.endpoints.find((e): e is usb.OutEndpoint => e.direction === 'out');

      if (!epIn || !epOut) {
        throw ERRORS.TypedError(
          HardwareErrorCode.DeviceNotFound,
          'USB endpoints not found (expected IN 0x81, OUT 0x01)'
        );
      }

      epIn.timeout = TRANSFER_TIMEOUT_MS;
      epOut.timeout = TRANSFER_TIMEOUT_MS;

      await this.drainStaleInput(path, epIn);

      this.openDevices.set(path, { device: dev, iface, epIn, epOut });
    } catch (err) {
      try {
        dev.close();
      } catch {
        // ignore close errors during cleanup
      }
      throw err;
    }
  }

  private async drainStaleInput(path: string, epIn: usb.InEndpoint): Promise<void> {
    const originalTimeout = epIn.timeout;
    epIn.timeout = 50;
    try {
      // Drain a small bounded number of packets left by the previous USB session.
      for (let index = 0; index < 16; index += 1) {
        try {
          await this.transferInOnce(path, epIn, PACKET_SIZE);
        } catch {
          break;
        }
      }
    } finally {
      epIn.timeout = originalTimeout;
    }
  }

  private createProtocolMismatchError(expected: ProtocolType) {
    return ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Device protocol mismatch: expected ${expected}, but device did not respond to expected protocol`
    );
  }

  private createProtocolDetectionError() {
    return ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Unable to detect USB protocol: device did not respond to Protocol V1 Initialize or Protocol V2 Ping'
    );
  }

  private async detectProtocol(
    path: string,
    expectedProtocol?: ProtocolType,
    protocolHint?: ProtocolType
  ): Promise<ProtocolType> {
    if (expectedProtocol === 'V2') {
      if (await this.probeProtocolV2(path)) {
        this.deviceProtocol.set(path, 'V2');
        this.Log?.debug(`[NodeUsbTransport] detectProtocol: path=${path} -> V2 (expected)`);
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
    await this.rotateProtocolV2UsbGeneration(path, 'Node USB protocol probe reset');

    try {
      // A timed-out probe may leave an IN transfer pending. Cancel and await it before
      // closing the interface, or libusb may never callback and release()/stop() will
      // wait forever, surfacing as Polling timeout (809).
      await this.cancelActiveTransfers(path);
      await this.closeOpenDevice(path);
    } catch (error) {
      this.Log?.debug('[NodeUsbTransport] close after protocol probe error:', error);
    }

    await this.enumerate();
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
              this.Log?.debug(
                `[NodeUsbTransport] reset after Protocol ${protocol} timeout failed:`,
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

  private async probeProtocolV2(path: string) {
    if (!this.messages || !this.messagesV2) {
      return false;
    }

    return probeProtocolV2Helper({
      call: (name, data, options) => this.callProtocolV2(path, name, data, options),
      timeoutMs: PROTOCOL_PROBE_TIMEOUT,
      logger: this.Log,
      logPrefix: 'ProtocolV2 NodeUSB',
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
    await this.transferOutOnce(path, this.getOpenDevice(path).epOut, Buffer.from(frame));
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
        const packet = await this.transferInOnce(
          path,
          this.getOpenDevice(path).epIn,
          PROTOCOL_V2_FRAME_MAX_BYTES
        );
        return new Uint8Array(
          packet.buffer.slice(packet.byteOffset, packet.byteOffset + packet.byteLength)
        );
      } catch (error) {
        if (!this.isUsbTransferTimeout(error)) {
          throw error;
        }
      }
    }
  }

  protected async resetProtocolV2UsbNativeLink(path: string, _reason: string): Promise<void> {
    await this.cancelActiveTransfers(path);
    await this.closeOpenDevice(path);
  }

  protected onProtocolV2UsbLinkInvalidated(path: string, reason: string) {
    this.deviceProtocol.delete(path);
    this.Log?.debug(`[NodeUsbTransport] Protocol V2 link invalidated: ${path}`, reason);
  }

  protected createProtocolV2UsbTimeoutError(name: string, timeoutMs: number): Error {
    return new ProtocolV2LinkError(
      'response-timeout',
      `Protocol V2 response timeout after ${timeoutMs}ms for ${name}`
    );
  }

  private async callProtocolV2(
    path: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    return this.callProtocolV2Usb(path, name, data, options);
  }

  /**
   * Receive a complete protobuf response from the device.
   * Reads 64-byte packets, strips 0x3F marker, reassembles into hex string.
   */
  private async receiveData(path: string, dev: OpenDevice, timeoutMs?: number): Promise<string> {
    const deadline = timeoutMs ? Date.now() + timeoutMs : undefined;
    const readPacket = async () => {
      const transferIn = this.transferInWithRetry(path, this.getOpenDevice(path), PACKET_SIZE);
      return deadline
        ? this.withProtocolReadTimeout(path, transferIn, Math.max(deadline - Date.now(), 1), 'V1')
        : transferIn;
    };

    // Read first packet, skip report byte
    const firstPacket = timeoutMs
      ? await readPacket()
      : await this.transferInWithRetry(path, dev, PACKET_SIZE);
    const firstData = skipReportByte(firstPacket);

    // Decode header: ## marker → { typeId, length, restBuffer }
    const { length, typeId, restBuffer } = ProtocolV1.decodeFirstChunk(toArrayBuffer(firstData));

    // Allocate result: typeId(2) + length(4) + payload(length)
    const lengthWithHeader = Number(length) + HEADER_LENGTH;
    const decoded = new ByteBuffer(lengthWithHeader);
    decoded.writeUint16(typeId);
    decoded.writeUint32(Number(length));
    if (length) {
      decoded.append(restBuffer);
    }

    // Read subsequent packets until complete
    // Re-resolve device on each iteration so we use a fresh handle after any reconnect
    while (decoded.offset < lengthWithHeader) {
      const packet = await readPacket();
      const pktData = skipReportByte(packet);
      const buf = toArrayBuffer(pktData);
      if (lengthWithHeader - decoded.offset >= PAYLOAD_SIZE) {
        decoded.append(buf);
      } else {
        decoded.append(buf.slice(0, lengthWithHeader - decoded.offset));
      }
    }

    decoded.reset();
    const result = decoded.toBuffer();
    return Buffer.from(result as unknown as ArrayBuffer).toString('hex');
  }

  getProtocolType(path: string): ProtocolType | undefined {
    return this.deviceProtocol.get(path);
  }
}
