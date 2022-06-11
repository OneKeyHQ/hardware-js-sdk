import EventEmitter from 'events';
import DeviceConnector from './DeviceConnector';
import { Device } from './Device';
import { getDeviceUUID } from '../utils/deviceFeaturesUtils';

export class DeviceList extends EventEmitter {
  devices: Record<string, Device> = {};

  connector?: DeviceConnector;

  /**
   * 获取已连接的设备列表
   * @returns {OneKeyDeviceInfo[]}
   */
  async getDeviceLists() {
    const deviceDiff = await this.connector?.enumerate();
    const descriptorList = deviceDiff?.descriptors ?? [];

    this.devices = {};
    const deviceList = [];
    console.log('get device list');
    for await (const descriptor of descriptorList) {
      const device = Device.fromDescriptor(descriptor);
      device.deviceConnector = this.connector;
      await device.connect();
      await device.initialize();
      await device.release();

      // clean session after release
      deviceList.push(device);
      if (device.features) {
        const uuid = getDeviceUUID(device.features);
        this.devices[uuid] = device;
      }
    }

    return deviceList;
  }

  allDevices(): Device[] {
    return Object.keys(this.devices).map(key => this.devices[key]);
  }

  getDevice(connectId: string) {
    return this.devices[connectId];
  }
}
