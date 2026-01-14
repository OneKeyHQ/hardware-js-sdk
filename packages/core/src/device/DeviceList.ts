import EventEmitter from 'events';

import { DevicePool } from './DevicePool';

import type DeviceConnector from './DeviceConnector';
import type { Device, InitOptions } from './Device';

export class DeviceList extends EventEmitter {
  devices: Record<string, Device> = {};

  connector?: DeviceConnector;

  /**
   * 获取已连接的设备列表
   * @returns {OneKeyDeviceInfo[]}
   */
  async getDeviceLists(connectId?: string, initOptions?: InitOptions) {
    const deviceDiff = await this.connector?.enumerate();
    const descriptorList = deviceDiff?.descriptors ?? [];

    this.devices = {};

    const { deviceList, devices } = await DevicePool.getDevices(
      descriptorList,
      connectId,
      initOptions
    );
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
