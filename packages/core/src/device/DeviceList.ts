import EventEmitter from 'events';
import DeviceConnector from './DeviceConnector';
import { Device } from './Device';
import { DevicePool } from './DevicePool';

export class DeviceList extends EventEmitter {
  devices: Record<string, Device> = {};

  connector?: DeviceConnector;

  /**
   * 获取已连接的设备列表
   * @returns {OneKeyDeviceInfo[]}
   */
  async getDeviceLists(connectId?: string) {
    const deviceDiff = await this.connector?.enumerate();
    const descriptorList = deviceDiff?.descriptors ?? [];

    this.devices = {};

    const { deviceList, devices } = await DevicePool.getDevices(descriptorList, connectId);
    this.devices = devices;
    return deviceList;
  }

  allDevices(): Device[] {
    return Object.keys(this.devices).map(key => this.devices[key]);
  }

  getDevice(connectId: string) {
    return this.devices[connectId];
  }
}
