import transport, { AcquireInput } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

const { parseConfigure } = transport;

const ONEKEY_FILTER = [
  { vendorId: 0x1209, productId: 0x53c0 },
  { vendorId: 0x1209, productId: 0x53c1 },
];

const CONFIGURATION_ID = 1;
const INTERFACE_ID = 0;
const ENDPOINT_ID = 1;

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
      return await Promise.resolve(true);
    } catch (e) {
      console.log('acquire error: ', e);
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

  async release()
}
export {};
