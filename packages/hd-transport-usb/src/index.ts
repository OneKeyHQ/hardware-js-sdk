import ByteBuffer from 'bytebuffer';
import * as usb from 'usb';
import transport from '@onekeyfe/hd-transport';
import { ONEKEY_WEBUSB_FILTER } from '@onekeyfe/hd-shared';

import { HEADER_LENGTH, PACKET_SIZE, REPORT_ID } from './constants';

import type { LowLevelDevice, LowlevelTransportSharedPlugin } from '@onekeyfe/hd-transport';

const { decodeProtocol } = transport;

/** USB interface number for vendor-specific communication (same as Bridge) */
const INTERFACE_NUMBER = 0;
/** USB endpoint addresses (same as Bridge's normalIface) */
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
 * The currently active device — used by receive() since
 * LowlevelTransportSharedPlugin.receive() takes no uuid parameter.
 */
let activeDevice: OpenDevice | null = null;

/** Map of uuid → open device state */
const openDevices = new Map<string, OpenDevice>();

/**
 * Build a unique identifier for a USB device.
 * Uses bus number + device address which is stable within a session.
 */
function getDeviceId(dev: usb.Device): string {
  return `usb:${dev.busNumber}:${dev.deviceAddress}`;
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
 * Read a single 64-byte packet from the device via libusb bulk/interrupt transfer.
 */
async function readPacket(dev: OpenDevice): Promise<Buffer> {
  return transferIn(dev.epIn, PACKET_SIZE);
}

/**
 * Skip the 0x3F protocol marker byte from a USB packet.
 * The device sends 0x3F as the first byte of every response packet.
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
 * Node.js USB plugin for LowlevelTransport.
 *
 * Implements the 6-method LowlevelTransportSharedPlugin interface
 * using the `usb` (libusb) library for direct USB communication
 * with OneKey hardware wallets.
 *
 * Uses libusb to access the vendor-specific interface (class 255)
 * which is NOT visible to the HID framework on macOS.
 * This is the same approach OneKey Bridge uses.
 */
export const UsbPlugin: LowlevelTransportSharedPlugin = {
  version: '1.0.0',

  async init(): Promise<void> {
    // libusb requires no global initialization
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async enumerate(): Promise<LowLevelDevice[]> {
    const allDevices = usb.getDeviceList();

    const onekeyDevices = allDevices.filter(d => {
      const { idVendor, idProduct } = d.deviceDescriptor;
      return ONEKEY_WEBUSB_FILTER.some(f => idVendor === f.vendorId && idProduct === f.productId);
    });

    return onekeyDevices.map(d => {
      // Try to get product name
      let name = 'OneKey';
      try {
        d.open();
        const iface = d.interface(INTERFACE_NUMBER);
        // Check interface class is 255 (vendor-specific) — the communication interface
        if (iface && iface.descriptor.bInterfaceClass === 255) {
          name = 'OneKey';
        }
        d.close();
      } catch {
        // Can't open — might be in use, just return basic info
        try {
          d.close();
        } catch {
          /* ignore */
        }
      }

      return {
        id: getDeviceId(d),
        name,
        commType: 'usb' as const,
      };
    });
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async connect(uuid: string): Promise<void> {
    const existing = openDevices.get(uuid);
    if (existing) {
      activeDevice = existing;
      return;
    }

    // Find the device by our uuid (bus:address)
    const allDevices = usb.getDeviceList();
    const dev = allDevices.find(d => getDeviceId(d) === uuid);
    if (!dev) {
      throw new Error(`USB device not found: ${uuid}`);
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

    // Find IN and OUT endpoints
    const epIn = iface.endpoints.find(
      (e): e is usb.InEndpoint => e.direction === 'in' && e.address === ENDPOINT_IN
    );
    const epOut = iface.endpoints.find(
      (e): e is usb.OutEndpoint => e.direction === 'out' && e.address === ENDPOINT_OUT
    );

    if (!epIn || !epOut) {
      dev.close();
      throw new Error('USB endpoints not found (expected IN 0x81, OUT 0x01)');
    }

    epIn.timeout = TRANSFER_TIMEOUT_MS;
    epOut.timeout = TRANSFER_TIMEOUT_MS;

    const openDev: OpenDevice = { device: dev, iface, epIn, epOut };
    openDevices.set(uuid, openDev);
    activeDevice = openDev;
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async disconnect(uuid: string): Promise<void> {
    const openDev = openDevices.get(uuid);
    if (openDev) {
      try {
        openDev.iface.release(() => {
          try {
            openDev.device.close();
          } catch {
            /* ignore */
          }
        });
      } catch {
        try {
          openDev.device.close();
        } catch {
          /* ignore */
        }
      }
      openDevices.delete(uuid);
      if (activeDevice === openDev) {
        activeDevice = null;
      }
    }
  },

  async send(uuid: string, data: string): Promise<void> {
    const openDev = openDevices.get(uuid);
    if (!openDev) {
      throw new Error(`Device not connected: ${uuid}`);
    }
    activeDevice = openDev;

    // data is a hex string of a 64-byte packet (0x3F + 63 bytes payload),
    // already framed by LowlevelTransport's buildBuffers().
    const dataBuffer = Buffer.from(data, 'hex');

    // libusb transfers the raw packet directly — no Report ID prepend needed
    // (Report ID is a HID concept; libusb operates at USB level)
    await transferOut(openDev.epOut, dataBuffer);
  },

  async receive(): Promise<string> {
    if (!activeDevice) {
      throw new Error('No active device for receive');
    }
    const dev = activeDevice;

    // Mirrors WebUsbTransport.receiveData() exactly:
    // 1. Read first 64-byte packet, skip byte[0] (0x3F marker)
    const firstPacket = await readPacket(dev);
    const firstData = skipReportByte(firstPacket);

    // 2. Use SDK's decodeChunked to parse ## header → { typeId, length, restBuffer }
    const { length, typeId, restBuffer } = decodeProtocol.decodeChunked(toArrayBuffer(firstData));

    // 3. Allocate result buffer: typeId(2) + length(4) + payload(length)
    const lengthWithHeader = Number(length) + HEADER_LENGTH;
    const decoded = new ByteBuffer(lengthWithHeader);
    decoded.writeUint16(typeId);
    decoded.writeUint32(Number(length));
    if (length) {
      decoded.append(restBuffer);
    }

    // 4. Read subsequent packets until complete
    while (decoded.offset < lengthWithHeader) {
      const packet = await readPacket(dev);
      const pktData = skipReportByte(packet);
      const buf = toArrayBuffer(pktData);
      if (lengthWithHeader - decoded.offset >= PACKET_SIZE) {
        decoded.append(buf);
      } else {
        decoded.append(buf.slice(0, lengthWithHeader - decoded.offset));
      }
    }

    // 5. Return as hex string
    decoded.reset();
    const result = decoded.toBuffer();
    return Buffer.from(result as unknown as ArrayBuffer).toString('hex');
  },
};

export default UsbPlugin;
export { PACKET_SIZE } from './constants';
