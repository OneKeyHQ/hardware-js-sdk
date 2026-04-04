import ByteBuffer from 'bytebuffer';
import * as HID from 'node-hid';
import transport from '@onekeyfe/hd-transport';

import type { LowlevelTransportSharedPlugin, LowLevelDevice } from '@onekeyfe/hd-transport';

import { VENDOR_ID, PRODUCT_IDS, PACKET_SIZE, REPORT_ID, HEADER_LENGTH } from './constants';

const { decodeProtocol } = transport;

/** Read timeout in milliseconds */
const READ_TIMEOUT_MS = 30000;

/**
 * The currently connected device — used by receive() since
 * LowlevelTransportSharedPlugin.receive() takes no uuid parameter.
 * The LowlevelTransport always calls send() then receive() on the
 * same device, so we track the "active" device from connect/send.
 */
let activeDevice: HID.HIDAsync | null = null;

/** Map of uuid (HID path) → open HIDAsync device */
const openDevices = new Map<string, HID.HIDAsync>();

/**
 * Read a single HID packet from the device.
 * Uses HIDAsync.read(timeout) — non-blocking, with timeout protection.
 */
async function readPacket(device: HID.HIDAsync): Promise<Buffer> {
  const data = await device.read(READ_TIMEOUT_MS);
  if (!data || data.length === 0) {
    throw new Error('Empty read from HID device (timeout or disconnected)');
  }
  return data;
}

/**
 * Skip the 0x3F protocol marker byte from an HID packet.
 * The device sends 0x3F as the first byte of every packet.
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
 * Node.js HID plugin for LowlevelTransport.
 *
 * Implements the 6-method LowlevelTransportSharedPlugin interface
 * using the `node-hid` library for direct USB HID communication
 * with OneKey hardware wallets — no Bridge daemon required.
 *
 * Uses node-hid v3 HIDAsync API for non-blocking I/O.
 */
export const NodeHidPlugin: LowlevelTransportSharedPlugin = {
  version: '1.0.0',

  async init(): Promise<void> {
    // node-hid requires no global initialization
  },

  async enumerate(): Promise<LowLevelDevice[]> {
    const allDevices = await HID.devicesAsync();

    // Filter to OneKey devices and deduplicate by path (interface 0 only)
    const onekeyDevices = allDevices.filter(
      d =>
        d.vendorId === VENDOR_ID &&
        PRODUCT_IDS.includes(d.productId ?? 0) &&
        (d.interface === 0 || d.interface === -1) && // -1 on macOS when interface is not reported
        d.path != null &&
        d.path.length > 0
    );

    return onekeyDevices.map(d => ({
      id: d.path!,
      name: d.product || 'OneKey',
      commType: 'usb' as const,
    }));
  },

  async connect(uuid: string): Promise<void> {
    if (openDevices.has(uuid)) {
      // Already open — just set as active
      activeDevice = openDevices.get(uuid)!;
      return;
    }

    const device = await HID.HIDAsync.open(uuid);
    openDevices.set(uuid, device);
    activeDevice = device;
  },

  async disconnect(uuid: string): Promise<void> {
    const device = openDevices.get(uuid);
    if (device) {
      try {
        await device.close();
      } catch {
        // Ignore close errors (device may already be disconnected)
      }
      openDevices.delete(uuid);
      if (activeDevice === device) {
        activeDevice = null;
      }
    }
  },

  async send(uuid: string, data: string): Promise<void> {
    const device = openDevices.get(uuid);
    if (!device) {
      throw new Error(`Device not connected: ${uuid}`);
    }
    activeDevice = device;

    // data is a hex string of a 64-byte packet (0x3F + 63 bytes payload),
    // already framed by LowlevelTransport's buildBuffers().
    const dataBuffer = Buffer.from(data, 'hex');

    // node-hid write() requires first byte = Report ID on ALL platforms.
    // OneKey devices don't use numbered reports, so prepend 0x00.
    // See: https://github.com/node-hid/node-hid#devicewritedata
    const withReportId = Buffer.alloc(dataBuffer.length + 1);
    withReportId[0] = 0x00;
    dataBuffer.copy(withReportId, 1);
    await device.write([...withReportId]);
  },

  async receive(): Promise<string> {
    if (!activeDevice) {
      throw new Error('No active device for receive');
    }
    const device = activeDevice;

    // Mirrors WebUsbTransport.receiveData() exactly:
    // 1. Read first 64-byte packet, skip byte[0] (0x3F marker)
    const firstPacket = await readPacket(device);
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
    // Note: comparison uses PACKET_SIZE (64) matching WebUSB's receiveData().
    // After skipReportByte the actual data is 63 bytes, but the comparison
    // is intentionally loose — same pattern as webusb.ts:402.
    while (decoded.offset < lengthWithHeader) {
      const packet = await readPacket(device);
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

export default NodeHidPlugin;
export { VENDOR_ID, PRODUCT_IDS, PACKET_SIZE } from './constants';
