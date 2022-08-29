/* eslint-disable no-undef */
import transport, { AcquireInput } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import ByteBuffer from 'bytebuffer';

const { parseConfigure, buildEncodeBuffers, decodeProtocol, receiveOne, check } = transport;

const ONEKEY_FILTER = [
  { vendorId: 0x1209, productId: 0x53c0 },
  { vendorId: 0x1209, productId: 0x53c1 },
];

const CONFIGURATION_ID = 1;
const INTERFACE_ID = 0;
const ENDPOINT_ID = 1;
const PACKET_SIZE = 64;
const HEADER_LENGTH = 6;

export default class WebUsbTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  stopped = false;

  configured = false;

  Log?: any;

  usb?: USB;

  _lastDevices: Array<{ path: string; device: USBDevice }> = [];

  configurationId = CONFIGURATION_ID;

  endpointId = ENDPOINT_ID;

  interfaceId = INTERFACE_ID;

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

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  async enumerate() {
    const list = await this._getDeviceList();
    return list;
  }

  async _getDeviceList() {
    if (!this.usb) return [];
    const devices = await this.usb.getDevices();
    const onekeyDevices = devices.filter(dev => {
      const isOneKey = ONEKEY_FILTER.some(
        desc => dev.vendorId === desc.vendorId && dev.productId === desc.productId
      );
      const hasSerialNumber = typeof dev.serialNumber === 'string' && dev.serialNumber.length > 0;
      return isOneKey && hasSerialNumber;
    });

    this._lastDevices = onekeyDevices.map(device => ({
      path: device.serialNumber as string,
      device,
    }));

    return this._lastDevices;
  }

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

  _findDevice(path: string) {
    const device = this._lastDevices.find(d => d.path === path);
    if (device == null) {
      throw new Error('Action was interrupted.');
    }
    return device.device;
  }

  async connect(path: string, first: boolean) {
    for (let i = 0; i < 5; i++) {
      if (i > 0) {
        // eslint-disable-next-line no-promise-executor-return
        await new Promise(resolve => setTimeout(() => resolve(undefined), i * 200));
      }
      try {
        return await this._connectIn(path, first);
      } catch (e) {
        // ignore
        if (i === 4) {
          throw e;
        }
      }
    }
  }

  async _connectIn(path: string, first: boolean) {
    const device: USBDevice = await this._findDevice(path);
    await device.open();

    if (first) {
      await device.selectConfiguration(this.configurationId);
      try {
        await device.reset();
      } catch (error) {
        // empty
      }
    }

    await device.claimInterface(this.interfaceId);
  }

  async call(path: string, name: string, data: Record<string, unknown>) {
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const device = await this._findDevice(path);
    if (!device) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
    }

    const messages = this._messages;
    this.Log.debug('call-', ' name: ', name, ' data: ', data);
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

    const resData = await this._receive(path);
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    const jsonData = receiveOne(messages, resData);
    return check.call(jsonData);
  }

  async _receive(path: string) {
    const device: USBDevice = await this._findDevice(path);
    if (!device.opened) {
      await this.connect(path, false);
    }

    const firstPacket = await device.transferIn(this.endpointId, PACKET_SIZE);
    // console.log('receive first packet: ', firstPacket);
    const firstData = firstPacket.data?.buffer.slice(1);
    const { length, typeId, restBuffer } = decodeProtocol.decodeChunked(firstData as ArrayBuffer);

    // console.log('chunk length: ', length);

    const lengthWithHeader = Number(length + HEADER_LENGTH);
    const decoded = new ByteBuffer(lengthWithHeader);
    decoded.writeUint16(typeId);
    decoded.writeUint32(length);
    if (length) {
      decoded.append(restBuffer);
    }

    // console.log('first decoded: ', decoded);

    while (decoded.offset < lengthWithHeader) {
      const res = await device.transferIn(this.endpointId, PACKET_SIZE);
      // console.log('otherRes data: ', res?.data?.buffer);
      // console.log('otherRes length: ', res?.data?.byteLength);

      if (!res.data) {
        throw new Error('no data');
      }
      if (res.data.byteLength === 0) {
        // empty data
        console.warn('empty data');
      }
      const buffer = res.data.buffer.slice(1);
      if (lengthWithHeader - decoded.offset >= PACKET_SIZE) {
        decoded.append(buffer);
      } else {
        decoded.append(buffer.slice(0, lengthWithHeader - decoded.offset));
      }
      // console.log('current offset: ', decoded.offset);
    }
    decoded.reset();
    const result = decoded.toBuffer();
    return Buffer.from(result).toString('hex');
  }

  async release(path: string) {
    const device: USBDevice = await this._findDevice(path);
    await device.releaseInterface(this.interfaceId);
    await device.close();
  }

  async requestDevice() {
    if (!this.usb) return;
    try {
      const device = await this.usb.requestDevice({ filters: ONEKEY_FILTER });
      return device;
    } catch (e) {
      this.Log.debug('requestDevice error: ', e);
    }
  }
}
