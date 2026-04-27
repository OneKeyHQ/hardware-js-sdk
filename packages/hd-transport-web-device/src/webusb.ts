/* eslint-disable no-undef */
import transport, { LogBlockCommand, PROTOCOL_V2_USB_PID } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, ONEKEY_WEBUSB_FILTER, wait } from '@onekeyfe/hd-shared';
import ByteBuffer from 'bytebuffer';

import type { AcquireInput, OneKeyDeviceInfoBase, ProtocolType } from '@onekeyfe/hd-transport';

const { parseConfigure, decodeProtocol, check, ProtocolV1, ProtocolV2 } = transport;

const CONFIGURATION_ID = 1;
const INTERFACE_ID = 0;
const ENDPOINT_ID = 1;
const PACKET_SIZE = 64;
const HEADER_LENGTH = 6;
const PACKET_IO_MAX_RETRIES = 3;
const PACKET_IO_RETRY_DELAY = 300;

/**
 * Device information with path and WebUSB device instance
 */
export interface DeviceInfo extends OneKeyDeviceInfoBase {
  path: string;
  device: USBDevice;
}

/** USB endpoint pair discovered at connect time */
interface DeviceEndpoints {
  interfaceNumber: number;
  endpointIn: number;
  endpointOut: number;
}

export default class WebUsbTransport {
  messages: ReturnType<typeof transport.parseConfigure> | undefined;

  /** Protobuf schema for Protocol V2 devices (Pro2) */
  messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  /** Per-path protocol type (set from PID at connect time) */
  private deviceProtocol: Map<string, ProtocolType> = new Map();

  /** Per-path USB endpoint / interface numbers (discovered from USB descriptors) */
  private deviceEndpoints: Map<string, DeviceEndpoints> = new Map();

  name = 'WebUsbTransport';

  stopped = false;

  configured = false;

  Log?: any;

  usb?: USB;

  /**
   * Cached list of connected devices
   * This is essential for maintaining device references between operations
   */
  deviceList: Array<DeviceInfo> = [];

  configurationId = CONFIGURATION_ID;

  endpointId = ENDPOINT_ID;

  interfaceId = INTERFACE_ID;

  /**
   * Initialize WebUSB transport
   */
  init(logger: any) {
    this.Log = logger;

    const { usb } = navigator;
    if (!usb) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'WebUSB is not supported by current browsers'
      );
    }
    this.usb = usb;
  }

  /**
   * Configure Protocol V1 protobuf schema (legacy chunked 0x3F framing).
   */
  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this.messages = messages;
  }

  /**
   * Configure Protocol V2 protobuf schema (Pro2 0x5A framing).
   * Called by TransportManager after the default configure().
   */
  configureProtocolV2(signedData: any) {
    this.messagesV2 = parseConfigure(signedData);
    this.Log?.debug('[WebUsbTransport] Protocol V2 schema configured');
  }

  /**
   * Request user to select a device
   * This method must be called in response to a user action
   * to comply with WebUSB security requirements
   */
  async promptDeviceAccess() {
    if (!this.usb) return null;
    try {
      const device = await this.usb.requestDevice({ filters: ONEKEY_WEBUSB_FILTER });
      return device;
    } catch (e) {
      this.Log.debug(
        'requestDevice error: ',
        e instanceof Error ? `${e.name}: ${e.message}` : String(e)
      );
      return null;
    }
  }

  /**
   * Enumerate already connected devices
   * This method only returns devices that are already authorized by the browser
   * It does NOT prompt the user to select a device
   */
  async enumerate() {
    await this.getConnectedDevices();
    return this.deviceList;
  }

  /**
   * Get list of connected devices
   */
  async getConnectedDevices() {
    if (!this.usb) return [];

    const devices = await this.usb.getDevices();
    const onekeyDevices = devices.filter(dev => {
      const isOneKey = ONEKEY_WEBUSB_FILTER.some(
        desc => dev.vendorId === desc.vendorId && dev.productId === desc.productId
      );
      const hasSerialNumber = typeof dev.serialNumber === 'string' && dev.serialNumber.length > 0;
      return isOneKey && hasSerialNumber;
    });

    this.deviceList = onekeyDevices.map(device => ({
      path: device.serialNumber as string,
      device,
      commType: 'webusb',
    }));

    // Debug: log all discovered devices with PID to identify protocol version
    for (const dev of onekeyDevices) {
      const isProtocolV2 = dev.productId === PROTOCOL_V2_USB_PID;
      this.Log.debug(
        `[WebUSB] Device: name="${dev.productName}" serial="${dev.serialNumber}" ` +
          `VID=0x${dev.vendorId.toString(16)} PID=0x${dev.productId.toString(16)} ` +
          `${isProtocolV2 ? '→ Protocol V2' : '→ Protocol V1'}`
      );
    }

    return this.deviceList;
  }

  /**
   * Acquire device control
   */
  async acquire(input: AcquireInput) {
    if (!input.path) return;
    try {
      await this.connect(input.path ?? '', true);
      // Determine protocol from PID (set after connect so deviceList is populated)
      this.detectProtocol(input.path);
      return await Promise.resolve(input.path);
    } catch (e) {
      this.Log.debug('acquire error: ', e instanceof Error ? `${e.name}: ${e.message}` : String(e));
      throw e;
    }
  }

  /**
   * Determine protocol type from USB Product ID.
   * PID 0x53C1 (PROTOCOL_V2_USB_PID) → Protocol V2 (0x5A framing, Pro2)
   * All other PIDs        → Protocol V1 (64-byte chunked, 0x3F framing, Pro1 and earlier)
   *
   * We rely on PID because it is set in firmware and uniquely identifies the device
   * generation. No wire-level probe is needed.
   */
  private detectProtocol(path: string): ProtocolType {
    const deviceInfo = this.deviceList.find(d => d.path === path);
    const protocol: ProtocolType =
      deviceInfo?.device.productId === PROTOCOL_V2_USB_PID ? 'V2' : 'V1';
    this.deviceProtocol.set(path, protocol);
    this.Log.debug(
      `[WebUsbTransport] detectProtocol: path=${path} PID=0x${(
        deviceInfo?.device.productId ?? 0
      ).toString(16)} → ${protocol}`
    );
    return protocol;
  }

  /**
   * Find device by path
   */
  async findDevice(path: string) {
    // If device list is empty, refresh it first
    if (this.deviceList.length === 0) {
      await this.getConnectedDevices();
    }

    let device = this.deviceList.find(d => d.path === path);

    // If device not found after first attempt, try refreshing the list once more
    if (device == null) {
      await this.getConnectedDevices();
      device = this.deviceList.find(d => d.path === path);

      if (device == null) {
        throw new Error('Action was interrupted.');
      }
    }

    return device.device;
  }

  /**
   * Connect to device with retry mechanism
   */
  async connect(path: string, first: boolean) {
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.connectToDevice(path, first);
      } catch (e) {
        if (i === maxRetries - 1) {
          throw e;
        }
        await wait(i * 200);
      }
    }
  }

  /**
   * Discover vendor-class (0xFF) interface and its IN/OUT endpoint numbers from USB descriptors.
   * Falls back to legacy hardcoded values if no vendor interface is found.
   */
  private discoverEndpoints(device: USBDevice): DeviceEndpoints {
    for (const config of device.configurations) {
      for (const iface of config.interfaces) {
        for (const alt of iface.alternates) {
          if (alt.interfaceClass === 0xff) {
            let endpointIn = this.endpointId;
            let endpointOut = this.endpointId;
            for (const ep of alt.endpoints) {
              if (ep.direction === 'in') endpointIn = ep.endpointNumber;
              else endpointOut = ep.endpointNumber;
            }
            this.Log?.debug(
              `[WebUsbTransport] discovered vendor interface ${iface.interfaceNumber}, ` +
                `endpointIn=${endpointIn}, endpointOut=${endpointOut}`
            );
            return { interfaceNumber: iface.interfaceNumber, endpointIn, endpointOut };
          }
        }
      }
    }
    // Fallback: legacy hardcoded values
    this.Log?.debug('[WebUsbTransport] no vendor interface found, using defaults');
    return {
      interfaceNumber: this.interfaceId,
      endpointIn: this.endpointId,
      endpointOut: this.endpointId,
    };
  }

  /**
   * Connect to specific device.
   * Discovers interface/endpoint numbers from USB descriptors on first connection.
   */
  async connectToDevice(path: string, first: boolean) {
    const device: USBDevice = await this.findDevice(path);
    this.Log.debug(
      '[WebUsbTransport] connecting to device:',
      device.productName,
      'PID:',
      device.productId
    );

    await device.open();

    if (first) {
      await device.selectConfiguration(this.configurationId);
    }

    // Discover endpoints from USB descriptors (works for both Pro1 and Pro2)
    const endpoints = this.discoverEndpoints(device);
    this.deviceEndpoints.set(path, endpoints);

    await device.claimInterface(endpoints.interfaceNumber);
  }

  async post(session: string, name: string, data: Record<string, unknown>) {
    await this.call(session, name, data);
  }

  private getErrorMessage(error: unknown) {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && 'message' in error) {
      const { message } = error as { message?: unknown };
      return typeof message === 'string' ? message : String(message ?? '');
    }
    return String(error);
  }

  private isRetryablePacketIoError(error: unknown) {
    const message = this.getErrorMessage(error).toLowerCase();
    return (
      message.includes('transferout') ||
      message.includes('transferin') ||
      message.includes('usbdevice') ||
      message.includes('disconnected') ||
      message.includes('device not found') ||
      message.includes('action was interrupted') ||
      message.includes('networkerror')
    );
  }

  private async reconnectForPacketIoRetry(
    path: string,
    direction: 'in' | 'out',
    attempt: number,
    error: unknown
  ) {
    this.Log.debug(
      `[WebUsbTransport] transfer${direction} failed, retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
        error
      )}`
    );
    await wait(attempt * PACKET_IO_RETRY_DELAY);

    try {
      const currentDevice = await this.findDevice(path);
      if (currentDevice.opened) {
        const endpoints = this.deviceEndpoints.get(path);
        const ifaceNum = endpoints?.interfaceNumber ?? this.interfaceId;
        try {
          await currentDevice.releaseInterface(ifaceNum);
        } catch (releaseError) {
          this.Log.debug('[WebUsbTransport] releaseInterface before retry error:', releaseError);
        }
        await currentDevice.close();
      }
    } catch (closeError) {
      this.Log.debug('[WebUsbTransport] close device before retry error:', closeError);
    }

    await this.getConnectedDevices();
    await this.connect(path, false);
  }

  private getTransferInData(result: USBInTransferResult): DataView {
    if (result.status !== 'ok') {
      throw new Error(`transferIn status: ${String(result.status)}`);
    }
    if (!result.data || result.data.byteLength === 0) {
      throw new Error('transferIn no data');
    }
    return result.data;
  }

  private toArrayBuffer(buffer: ArrayBufferLike): ArrayBuffer {
    if (buffer instanceof ArrayBuffer) {
      return buffer;
    }
    const copied = new Uint8Array(buffer.byteLength);
    copied.set(new Uint8Array(buffer));
    return copied.buffer;
  }

  private async transferOutWithRetry(path: string, packet: Uint8Array) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PACKET_IO_MAX_RETRIES; attempt += 1) {
      try {
        const device = await this.findDevice(path);
        if (!device.opened) {
          await this.connect(path, false);
        }
        const endpoints = this.deviceEndpoints.get(path);
        const endpointOut = endpoints?.endpointOut ?? this.endpointId;
        const transferBuffer = this.toArrayBuffer(
          packet.buffer.slice(packet.byteOffset, packet.byteOffset + packet.byteLength)
        );
        await device.transferOut(endpointOut, transferBuffer);
        return;
      } catch (error) {
        lastError = error;
        const shouldRetry = attempt < PACKET_IO_MAX_RETRIES && this.isRetryablePacketIoError(error);
        if (!shouldRetry) {
          throw error;
        }
        try {
          await this.reconnectForPacketIoRetry(path, 'out', attempt, error);
        } catch (reconnectError) {
          lastError = reconnectError;
          this.Log.debug(
            `[WebUsbTransport] transferout reconnect failed on retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
              reconnectError
            )}`
          );
        }
      }
    }
    throw lastError;
  }

  private async transferInWithRetry(path: string, length: number): Promise<DataView> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PACKET_IO_MAX_RETRIES; attempt += 1) {
      try {
        const device = await this.findDevice(path);
        if (!device.opened) {
          await this.connect(path, false);
        }
        const endpoints = this.deviceEndpoints.get(path);
        const endpointIn = endpoints?.endpointIn ?? this.endpointId;
        const result = await device.transferIn(endpointIn, length);
        return this.getTransferInData(result);
      } catch (error) {
        lastError = error;
        const shouldRetry = attempt < PACKET_IO_MAX_RETRIES && this.isRetryablePacketIoError(error);
        if (!shouldRetry) {
          throw error;
        }
        try {
          await this.reconnectForPacketIoRetry(path, 'in', attempt, error);
        } catch (reconnectError) {
          lastError = reconnectError;
          this.Log.debug(
            `[WebUsbTransport] transferin reconnect failed on retry ${attempt}/${PACKET_IO_MAX_RETRIES}: ${this.getErrorMessage(
              reconnectError
            )}`
          );
        }
      }
    }
    throw lastError;
  }

  /**
   * Call device method — branches to Protocol V1 or Protocol V2 based on detected protocol.
   */
  async call(path: string, name: string, data: Record<string, unknown>) {
    if (this.messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const device = await this.findDevice(path);
    if (!device) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
    }

    const protocol = this.deviceProtocol.get(path) ?? 'V1';

    if (LogBlockCommand.has(name)) {
      this.Log.debug('call-', ' name: ', name, ' protocol: ', protocol);
    } else {
      this.Log.debug('call-', ' name: ', name, ' data: ', data, ' protocol: ', protocol);
    }

    if (protocol === 'V2') {
      return this.callProtocolV2(path, name, data);
    }

    // --- Protocol V1 path (Pro1 and earlier, 64-byte chunked 0x3F framing) ---
    const { messages } = this;
    const encodeBuffers = ProtocolV1.encode(messages, name, data);

    for (const buffer of encodeBuffers) {
      const newArray: Uint8Array = new Uint8Array(PACKET_SIZE);
      newArray[0] = 63;
      newArray.set(new Uint8Array(buffer), 1);
      await this.transferOutWithRetry(path, newArray);
    }

    const resData = await this.receiveData(path);
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    const jsonData = ProtocolV1.decode(messages, resData);
    return check.call(jsonData);
  }

  /**
   * Send/receive a single call over Protocol V2 (0x5A framing, Pro2).
   *
   * Encoding:  protobuf message → 2-byte LE msgType + pb bytes → Protocol V2 frame
   * Decoding:  Protocol V2 frame → msgType + pb bytes → protobuf message
   */
  private async callProtocolV2(path: string, name: string, data: Record<string, unknown>) {
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

    // USB endpoints reach the main MCU directly, so no proto-link routing fields
    // (channel/packetSrc) are needed. BLE goes through a coprocessor UART bridge
    // and must set them — see ElectronPro2BleTransport.call().
    const frame = ProtocolV2.encode(
      {
        protocolV1: protocolV1Messages,
        protocolV2: this.messagesV2,
      },
      name,
      data
    );

    // Protocol V2 supports a larger single frame than Protocol V1 chunk packets.
    await this.transferOutWithRetry(path, frame);

    // 4. Single transferIn — read up to 4096 bytes
    const rxDataView = await this.transferInWithRetry(path, 4096);
    const rxBytes = new Uint8Array(
      this.toArrayBuffer(
        rxDataView.buffer.slice(
          rxDataView.byteOffset,
          rxDataView.byteOffset + rxDataView.byteLength
        )
      )
    );

    const decoded = ProtocolV2.decode(
      {
        protocolV1: protocolV1Messages,
        protocolV2: this.messagesV2,
      },
      rxBytes
    );

    // Debug: log raw frame and decoded payload
    this.Log.debug(
      `[ProtocolV2] TX name=${name} | RX msgType=${decoded.msgType} pbPayload=${decoded.pbPayload.length}B`
    );
    this.Log.debug(
      `[ProtocolV2] RX raw frame (${rxBytes.length}B): ${Array.from(
        rxBytes.slice(0, Math.min(rxBytes.length, 64))
      )
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')}${rxBytes.length > 64 ? '...' : ''}`
    );
    this.Log.debug(
      `[ProtocolV2] RX pb hex (${decoded.pbPayload.length}B): ${Array.from(decoded.pbPayload)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join(' ')}`
    );

    this.Log.debug(
      `[ProtocolV2] Decoded ${decoded.messageName}:`,
      JSON.stringify(decoded.message, null, 2)
    );

    return check.call(decoded);
  }

  /**
   * Receive data from device
   */
  async receiveData(path: string) {
    const firstPacketData = await this.transferInWithRetry(path, PACKET_SIZE);
    const firstData = this.toArrayBuffer(firstPacketData.buffer.slice(1));
    const { length, typeId, restBuffer } = decodeProtocol.decodeChunked(firstData);

    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    const lengthWithHeader = Number(length + HEADER_LENGTH);
    const decoded = new ByteBuffer(lengthWithHeader);
    decoded.writeUint16(typeId);
    decoded.writeUint32(length);
    if (length) {
      decoded.append(restBuffer);
    }

    while (decoded.offset < lengthWithHeader) {
      const packetData = await this.transferInWithRetry(path, PACKET_SIZE);
      const buffer = this.toArrayBuffer(packetData.buffer.slice(1));
      if (lengthWithHeader - decoded.offset >= PACKET_SIZE) {
        decoded.append(buffer);
      } else {
        decoded.append(buffer.slice(0, lengthWithHeader - decoded.offset));
      }
    }
    decoded.reset();
    const result = decoded.toBuffer();
    return Buffer.from(result as unknown as ArrayBuffer).toString('hex');
  }

  /**
   * Release device
   */
  async release(path: string) {
    const device: USBDevice = await this.findDevice(path);
    const endpoints = this.deviceEndpoints.get(path);
    const ifaceNum = endpoints?.interfaceNumber ?? this.interfaceId;
    await device.releaseInterface(ifaceNum);
    await device.close();
    this.deviceProtocol.delete(path);
    this.deviceEndpoints.delete(path);
  }

  /**
   * Expose the detected protocol type for a given device path.
   * Used by upper layers (e.g. TransportManager) to select the correct schema.
   */
  getProtocolType(path: string): ProtocolType {
    return this.deviceProtocol.get(path) ?? 'V1';
  }
}
