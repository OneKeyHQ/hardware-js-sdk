import ByteBuffer from 'bytebuffer';
import * as usb from 'usb';
import transport, { LogBlockCommand } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, ONEKEY_WEBUSB_FILTER } from '@onekeyfe/hd-shared';

import { HEADER_LENGTH, PACKET_SIZE, PAYLOAD_SIZE, REPORT_ID } from './constants';

import type EventEmitter from 'events';
import type { AcquireInput, OneKeyDeviceInfo } from '@onekeyfe/hd-transport';

const { parseConfigure, buildEncodeBuffers, decodeProtocol, receiveOne, check } = transport;

/** USB interface number for vendor-specific communication */
const INTERFACE_NUMBER = 0;
/** USB endpoint addresses */
const ENDPOINT_IN = 0x81;
const ENDPOINT_OUT = 0x01;

/** Transfer timeout in milliseconds */
const TRANSFER_TIMEOUT_MS = 30000;

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
function readSerialNumber(
  dev: usb.Device,
  openDevices?: Map<string, OpenDevice>
): Promise<string> {
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

  return new Promise(resolve => {
    try {
      dev.open();
      try {
        dev.getStringDescriptor(iSerialNumber, (_err: Error | undefined, data?: string) => {
          try {
            dev.close();
          } catch {
            /* ignore */
          }
          resolve(data || busId);
        });
      } catch {
        try {
          dev.close();
        } catch {
          /* ignore */
        }
        resolve(busId);
      }
    } catch {
      // dev.open() failed (e.g. LIBUSB_ERROR_BUSY if already open elsewhere)
      resolve(busId);
    }
  });
}

/**
 * Promisified USB IN transfer.
 */
function transferIn(ep: usb.InEndpoint, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    ep.transfer(length, (err: Error | undefined, data: Buffer | undefined) => {
      if (err) return reject(err);
      if (!data || data.length === 0) return reject(new Error('Empty USB transfer'));
      resolve(data);
    });
  });
}

/**
 * Promisified USB OUT transfer.
 */
function transferOut(ep: usb.OutEndpoint, data: Buffer): Promise<void> {
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

  name = 'NodeUsbTransport';

  configured = false;

  Log?: any;

  emitter?: EventEmitter;

  /** serial → bus id, built during enumerate */
  private serialToBusId = new Map<string, string>();

  /** path → opened device state */
  private openDevices = new Map<string, OpenDevice>();

  /**
   * Initialize transport.
   * Signature matches the Transport.init interface (logger, emitter).
   */
  init(logger: any, emitter?: EventEmitter) {
    this.Log = logger;
    this.emitter = emitter;
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this.messages = messages;
  }

  listen() {
    // empty — could add hotplug events via usb.on('attach'/'detach')
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
      await this.openDevice(path);
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
  async call(path: string, name: string, data: Record<string, unknown>) {
    if (!this.messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const openDev = this.openDevices.get(path);
    if (!openDev) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device not acquired: ${path}`);
    }

    const { messages } = this;
    if (LogBlockCommand.has(name)) {
      this.Log?.debug('NodeUsbTransport call-', ' name: ', name);
    } else {
      this.Log?.debug('NodeUsbTransport call-', ' name: ', name, ' data: ', data);
    }

    // Encode protobuf message into 63-byte chunks (same as WebUsbTransport)
    const encodeBuffers = buildEncodeBuffers(messages, name, data);

    // Send each chunk with 0x3F report ID prefix
    for (const buffer of encodeBuffers) {
      const packet = new Uint8Array(PACKET_SIZE);
      packet[0] = REPORT_ID;
      packet.set(new Uint8Array(buffer), 1);
      await transferOut(openDev.epOut, Buffer.from(packet));
    }

    // Receive response
    const resData = await this.receiveData(openDev);
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    const jsonData = receiveOne(messages, resData);
    return check.call(jsonData);
  }

  cancel() {
    this.Log?.debug('NodeUsbTransport cancel');
  }

  // --- Private helpers ---

  /**
   * Open a USB device by path (serial number), claim interface, cache endpoints.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
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

    dev.open();
    dev.timeout = TRANSFER_TIMEOUT_MS;

    const iface = dev.interface(INTERFACE_NUMBER);

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

    const epIn = iface.endpoints.find(
      (e): e is usb.InEndpoint => e.direction === 'in' && e.address === ENDPOINT_IN
    );
    const epOut = iface.endpoints.find(
      (e): e is usb.OutEndpoint => e.direction === 'out' && e.address === ENDPOINT_OUT
    );

    if (!epIn || !epOut) {
      dev.close();
      throw ERRORS.TypedError(
        HardwareErrorCode.DeviceNotFound,
        'USB endpoints not found (expected IN 0x81, OUT 0x01)'
      );
    }

    epIn.timeout = TRANSFER_TIMEOUT_MS;
    epOut.timeout = TRANSFER_TIMEOUT_MS;

    this.openDevices.set(path, { device: dev, iface, epIn, epOut });
  }

  /**
   * Receive a complete protobuf response from the device.
   * Reads 64-byte packets, strips 0x3F marker, reassembles into hex string.
   */
  private async receiveData(dev: OpenDevice): Promise<string> {
    // Read first packet, skip report byte
    const firstPacket = await transferIn(dev.epIn, PACKET_SIZE);
    const firstData = skipReportByte(firstPacket);

    // Decode header: ## marker → { typeId, length, restBuffer }
    const { length, typeId, restBuffer } = decodeProtocol.decodeChunked(toArrayBuffer(firstData));

    // Allocate result: typeId(2) + length(4) + payload(length)
    const lengthWithHeader = Number(length) + HEADER_LENGTH;
    const decoded = new ByteBuffer(lengthWithHeader);
    decoded.writeUint16(typeId);
    decoded.writeUint32(Number(length));
    if (length) {
      decoded.append(restBuffer);
    }

    // Read subsequent packets until complete
    while (decoded.offset < lengthWithHeader) {
      const packet = await transferIn(dev.epIn, PACKET_SIZE);
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
}

export { PACKET_SIZE } from './constants';
