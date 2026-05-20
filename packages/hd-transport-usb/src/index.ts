import ByteBuffer from 'bytebuffer';
import * as usb from 'usb';
import transport, {
  LogBlockCommand,
  PROTOCOL_V1_CHUNK_PAYLOAD_SIZE,
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V1_REPORT_ID,
  PROTOCOL_V1_USB_PACKET_SIZE,
  PROTOCOL_V2_CHANNEL_USB,
  PROTOCOL_V2_FRAME_MAX_BYTES,
  ProtocolV2FrameAssembler,
  ProtocolV2Session,
  probeProtocolV2 as probeProtocolV2Helper,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, ONEKEY_WEBUSB_FILTER, wait } from '@onekeyfe/hd-shared';

import type EventEmitter from 'events';
import type {
  AcquireInput,
  OneKeyDeviceInfo,
  ProtocolType,
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
const PROTOCOL_PROBE_TIMEOUT = 1000;

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
 * Promisified USB IN transfer (single attempt).
 */
function transferInOnce(ep: usb.InEndpoint, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    ep.transfer(length, (err: Error | undefined, data: Buffer | undefined) => {
      if (err) return reject(err);
      if (!data || data.length === 0) return reject(new Error('Empty USB transfer'));
      resolve(data);
    });
  });
}

/**
 * Promisified USB OUT transfer (single attempt).
 */
function transferOutOnce(ep: usb.OutEndpoint, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    ep.transfer(data, (err: Error | undefined) => {
      if (err) return reject(err);
      resolve();
    });
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
export default class NodeUsbTransport {
  messages: ReturnType<typeof transport.parseConfigure> | undefined;

  /** Protobuf schema for Protocol V2 transports. */
  messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

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

  /** Per-path Protocol V2 frame assembler, preserving buffered frames during reads. */
  private protocolV2Assemblers: Map<string, ProtocolV2FrameAssembler> = new Map();

  /** per-path reconnect lock to prevent concurrent reconnects */
  private reconnectLocks = new Map<string, Promise<OpenDevice>>();

  /** set to true when cancel() is called; checked by retry loops */
  private cancelled = false;

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
    this.messagesV2 = parseConfigure(signedData);
    this.Log?.debug('[NodeUsbTransport] Protocol V2 schema configured');
  }

  listen() {
    // empty — could add hotplug events via usb.on('attach'/'detach')
  }

  stop() {
    // Placeholder — no background listeners to tear down
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
    const path = input.path ?? '';
    if (!path) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, 'No device path provided');
    }

    try {
      this.openDevice(path);
      await this.detectProtocol(path, input.expectedProtocol);
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
    await this.closeOpenDevice(path);
    this.deviceProtocol.delete(path);
    this.protocolV2Assemblers.delete(path);
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

    const protocol = this.deviceProtocol.get(path) ?? 'V1';
    if (LogBlockCommand.has(name)) {
      this.Log?.debug('NodeUsbTransport call-', ' name: ', name, ' protocol: ', protocol);
    } else {
      this.Log?.debug(
        'NodeUsbTransport call-',
        ' name: ',
        name,
        ' data: ',
        data,
        ' protocol: ',
        protocol
      );
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
    this.Log?.debug('NodeUsbTransport cancel');
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

  private getDeviceInterface(dev: usb.Device): usb.Interface {
    const vendorInterface = dev.interfaces.find(
      iface => iface.descriptor.bInterfaceClass === 0xff
    );
    const defaultInterface = dev.interfaces.find(
      iface => iface.descriptor.bInterfaceNumber === INTERFACE_NUMBER
    );
    const iface = vendorInterface ?? defaultInterface ?? dev.interfaces[0];

    if (!iface) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, 'USB interface not found');
    }

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

      // Close the existing device without clearing the detected protocol cache.
      try {
        await this.closeOpenDevice(path);
      } catch (releaseError) {
        this.Log?.debug('[NodeUsbTransport] release before retry error:', releaseError);
      }

      // Re-enumerate to refresh device list, then re-open
      await this.enumerate();
      this.openDevice(path);

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
          await transferOutOnce(this.getOpenDevice(path).epOut, Buffer.from(packet));
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
    length: number
  ): Promise<Buffer> {
    let lastError: unknown;
    let currentDev = openDev;
    for (let attempt = 1; attempt <= PACKET_IO_MAX_RETRIES; attempt++) {
      if (this.cancelled) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside, 'Cancelled');
      }
      try {
        return await transferInOnce(currentDev.epIn, length);
      } catch (error) {
        lastError = error;
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
    throw lastError;
  }

  /**
   * Open a USB device by path (serial number), claim interface, cache endpoints.
   */
  private openDevice(path: string): void {
    const existing = this.openDevices.get(path);
    if (existing) return;

    // Resolve serial → bus id, then find a fresh device object
    const busId = this.serialToBusId.get(path) ?? path;
    const allDevices = usb.getDeviceList();
    const dev = allDevices.find(d => getBusId(d) === busId);
    if (!dev) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `USB device not found: ${path}`);
    }

    dev.open();

    try {
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

  private createProtocolMismatchError(expected: ProtocolType) {
    return ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Device protocol mismatch: expected ${expected}, but device did not respond to expected protocol`
    );
  }

  private async detectProtocol(
    path: string,
    expectedProtocol?: ProtocolType
  ): Promise<ProtocolType> {
    if (expectedProtocol === 'V1') {
      if (await this.probeProtocolV1(path)) {
        this.deviceProtocol.set(path, 'V1');
        this.Log?.debug(`[NodeUsbTransport] detectProtocol: path=${path} -> V1 (expected)`);
        return 'V1';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (expectedProtocol === 'V2') {
      if (await this.probeProtocolV2(path)) {
        this.deviceProtocol.set(path, 'V2');
        this.Log?.debug(`[NodeUsbTransport] detectProtocol: path=${path} -> V2 (expected)`);
        return 'V2';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (this.deviceProtocol.get(path) === 'V2' && (await this.probeProtocolV2(path))) {
      this.deviceProtocol.set(path, 'V2');
      this.Log?.debug(`[NodeUsbTransport] detectProtocol: path=${path} -> V2 (cached)`);
      return 'V2';
    }

    let protocol: ProtocolType = 'V1';
    if (!(await this.probeProtocolV1(path)) && (await this.probeProtocolV2(path))) {
      protocol = 'V2';
    }
    this.deviceProtocol.set(path, protocol);
    this.Log?.debug(`[NodeUsbTransport] detectProtocol: path=${path} -> ${protocol}`);
    return protocol;
  }

  private async resetConnectionAfterProbe(path: string) {
    this.protocolV2Assemblers.get(path)?.reset();

    try {
      await this.closeOpenDevice(path);
    } catch (error) {
      this.Log?.debug('[NodeUsbTransport] close after protocol probe error:', error);
    }

    await this.enumerate();
    this.openDevice(path);
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
    } catch (error) {
      this.Log?.debug('[NodeUsbTransport] Protocol V1 Initialize probe failed:', error);
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

  private async writeProtocolV2Frame(path: string, frame: Uint8Array) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PACKET_IO_MAX_RETRIES; attempt++) {
      if (this.cancelled) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside, 'Cancelled');
      }
      try {
        await transferOutOnce(this.getOpenDevice(path).epOut, Buffer.from(frame));
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
          this.Log?.debug(
            `[NodeUsbTransport] Protocol V2 write reconnect failed on retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
              reconnectError
            )}`
          );
          break;
        }
      }
    }
    throw lastError;
  }

  private async receiveProtocolV2Frame(path: string, timeoutMs?: number): Promise<Uint8Array> {
    let assembler = this.protocolV2Assemblers.get(path);
    if (!assembler) {
      assembler = new ProtocolV2FrameAssembler(PROTOCOL_V2_FRAME_MAX_BYTES);
      this.protocolV2Assemblers.set(path, assembler);
    }

    let frame: Uint8Array | undefined = assembler.push(new Uint8Array(0));
    const deadline = timeoutMs ? Date.now() + timeoutMs : undefined;

    while (!frame) {
      const transferIn = this.transferInWithRetry(
        path,
        this.getOpenDevice(path),
        PROTOCOL_V2_FRAME_MAX_BYTES
      );
      const packet = deadline
        ? await this.withProtocolReadTimeout(
            path,
            transferIn,
            Math.max(deadline - Date.now(), 1),
            'V2'
          )
        : await transferIn;
      const bytes = new Uint8Array(
        packet.buffer.slice(packet.byteOffset, packet.byteOffset + packet.byteLength)
      );
      try {
        frame = assembler.push(bytes);
      } catch (error) {
        throw ERRORS.TypedError(
          HardwareErrorCode.NetworkError,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
    return frame;
  }

  private async callProtocolV2(
    path: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    const protocolV1Messages = this.messages;
    if (!this.messagesV2) {
      throw ERRORS.TypedError(
        HardwareErrorCode.TransportNotConfigured,
        'Protocol V2 schema not configured'
      );
    }
    if (!protocolV1Messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const session = new ProtocolV2Session({
      schemas: {
        protocolV1: protocolV1Messages,
        protocolV2: this.messagesV2,
      },
      router: PROTOCOL_V2_CHANNEL_USB,
      writeFrame: (frame: Uint8Array) => this.writeProtocolV2Frame(path, frame),
      readFrame: () => this.receiveProtocolV2Frame(path, options?.timeoutMs),
      logger: this.Log,
      logPrefix: 'ProtocolV2 NodeUSB',
      createTimeoutError: (_messageName: string, timeoutMs: number) =>
        new Error(`Protocol V2 response timeout after ${timeoutMs}ms for ${name}`),
    });

    this.protocolV2Assemblers.get(path)?.reset();
    return session.call(name, data, options);
  }

  /**
   * Receive a complete protobuf response from the device.
   * Reads 64-byte packets, strips 0x3F marker, reassembles into hex string.
   */
  private async receiveData(
    path: string,
    dev: OpenDevice,
    timeoutMs?: number
  ): Promise<string> {
    const deadline = timeoutMs ? Date.now() + timeoutMs : undefined;
    const readPacket = async () => {
      const transferIn = this.transferInWithRetry(path, this.getOpenDevice(path), PACKET_SIZE);
      return deadline
        ? this.withProtocolReadTimeout(
            path,
            transferIn,
            Math.max(deadline - Date.now(), 1),
            'V1'
          )
        : transferIn;
    };

    // Read first packet, skip report byte
    const firstPacket = timeoutMs ? await readPacket() : await this.transferInWithRetry(path, dev, PACKET_SIZE);
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

  getProtocolType(path: string): ProtocolType {
    return this.deviceProtocol.get(path) ?? 'V1';
  }
}
