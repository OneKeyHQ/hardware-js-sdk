import EventEmitter from 'events';
import TransportManager from '../data-manager/TransportManager';
import DeviceConnector from './DeviceConnector';
import { Device } from './Device';

export class DeviceList extends EventEmitter {
  devices: Record<string, Device> = {};

  connector: DeviceConnector;

  constructor() {
    super();
    TransportManager.load();
    this.connector = new DeviceConnector();
  }

  /**
   * 获取已连接的设备列表
   * @returns {OneKeyDeviceInfoWithSession[]}
   */
  async getDeviceLists() {
    const deviceDiff = await this.connector.enumerate();
    const deviceList = deviceDiff.connected ?? [];
    this.devices = deviceList.reduce<Record<string, Device>>((prev, device) => {
      prev[device.path] = new Device(device);
      return prev;
    }, {});

    return deviceList;
  }

  allDevices(): Device[] {
    return Object.keys(this.devices).map(key => this.devices[key]);
  }

  getDevice(devicePath: string) {
    return this.devices[devicePath];
  }
}
