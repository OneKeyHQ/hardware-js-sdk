import EventEmitter from 'events';
import DeviceConnector from './DeviceConnector';
import { Device } from './Device';

export class DeviceList extends EventEmitter {
  devices: Record<string, Device> = {};

  connector?: DeviceConnector;

  /**
   * 获取已连接的设备列表
   * @returns {OneKeyDeviceInfo[]}
   */
  async getDeviceLists() {
    const deviceDiff = await this.connector?.enumerate();
    const deviceList = deviceDiff?.descriptors ?? [];
    this.devices = deviceList.reduce<Record<string, Device>>((prev, device) => {
      prev[device.path] = new Device(device);
      return prev;
    }, {});

    return deviceList;
  }

  allDevices(): Device[] {
    return Object.keys(this.devices).map(key => this.devices[key]);
  }

  getDevice(connectId: string) {
    return this.devices[connectId];
  }
}
