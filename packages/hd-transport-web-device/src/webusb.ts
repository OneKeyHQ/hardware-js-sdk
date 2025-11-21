/* eslint-disable no-undef */
import transport, { AcquireInput, LogBlockCommand } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, ONEKEY_WEBUSB_FILTER, wait } from '@onekeyfe/hd-shared';
import ByteBuffer from 'bytebuffer';

const { parseConfigure, buildEncodeBuffers, decodeProtocol, receiveOne, check } = transport;

const CONFIGURATION_ID = 1;
const INTERFACE_ID = 0;
const ENDPOINT_ID = 1;
const PACKET_SIZE = 64;
const HEADER_LENGTH = 6;

/**
 * Device information with path and WebUSB device instance
 */
interface DeviceInfo {
  path: string;
  device: USBDevice;
}

export default class WebUsbTransport {
  messages: ReturnType<typeof transport.parseConfigure> | undefined;

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
   * Configure transport protocol
   */
  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this.messages = messages;
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
      this.Log.debug('requestDevice error: ', e);
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
    }));

    return this.deviceList;
  }

  /**
   * Acquire device control
   */
  async acquire(input: AcquireInput) {
    if (!input.path) return;
    try {
      await this.connect(input.path ?? '', true);
      return await Promise.resolve(input.path);
    } catch (e) {
      this.Log.debug('acquire error: ', e);
      throw e;
    }
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
   * Connect to specific device
   */
  async connectToDevice(path: string, first: boolean) {
    const device: USBDevice = await this.findDevice(path);
    await device.open();

    if (first) {
      await device.selectConfiguration(this.configurationId);
      try {
        await device.reset();
      } catch (error) {
        // Ignore reset errors
      }
    }

    await device.claimInterface(this.interfaceId);
  }

  async post(session: string, name: string, data: Record<string, unknown>) {
    await this.call(session, name, data);
  }

  /**
   * Call device method
   */
  async call(path: string, name: string, data: Record<string, unknown>) {
    if (this.messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const device = await this.findDevice(path);
    if (!device) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
    }

    const { messages } = this;
    if (LogBlockCommand.has(name)) {
      this.Log.debug('call-', ' name: ', name);
    } else {
      this.Log.debug('call-', ' name: ', name, ' data: ', data);
    }
    const encodeBuffers = buildEncodeBuffers(messages, name, data);

    for (const buffer of encodeBuffers) {
      const newArray: Uint8Array = new Uint8Array(PACKET_SIZE);
      newArray[0] = 63;
      newArray.set(new Uint8Array(buffer), 1);
      // console.log('send packet: ', newArray);

      if (!device.opened) {
        await this.connect(path, false);
      }
      await device.transferOut(this.endpointId, newArray);
    }

    const resData = await this.receiveData(path);
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    const jsonData = receiveOne(messages, resData);
    return check.call(jsonData);
  }

  /**
   * Receive data from device
   */
  async receiveData(path: string) {
    const device: USBDevice = await this.findDevice(path);
    if (!device.opened) {
      await this.connect(path, false);
    }

    const firstPacket = await device.transferIn(this.endpointId, PACKET_SIZE);
    const firstData = firstPacket.data?.buffer.slice(1);
    const { length, typeId, restBuffer } = decodeProtocol.decodeChunked(firstData as ArrayBuffer);

    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    const lengthWithHeader = Number(length + HEADER_LENGTH);
    const decoded = new ByteBuffer(lengthWithHeader);
    decoded.writeUint16(typeId);
    decoded.writeUint32(length);
    if (length) {
      decoded.append(restBuffer);
    }

    while (decoded.offset < lengthWithHeader) {
      const res = await device.transferIn(this.endpointId, PACKET_SIZE);

      if (!res.data) {
        throw new Error('no data');
      }
      if (res.data.byteLength === 0) {
        // empty data
        console.warn('empty data');
      }
      const buffer = res.data.buffer.slice(1);
      if (lengthWithHeader - decoded.offset >= PACKET_SIZE) {
        decoded.append(buffer as unknown as ArrayBuffer);
      } else {
        decoded.append(
          buffer.slice(0, lengthWithHeader - decoded.offset) as unknown as ArrayBuffer
        );
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
    await device.releaseInterface(this.interfaceId);
    await device.close();
  }
}
