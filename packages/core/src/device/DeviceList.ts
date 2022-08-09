import EventEmitter from 'events';
import DeviceConnector from './DeviceConnector';
import { Device } from './Device';
// import { getDeviceUUID } from '../utils/deviceFeaturesUtils';
import { getLogger, LoggerNames } from '../utils';
import { DevicePool } from './DevicePool';

// const cacheDeviceMap = new Map<string, Device>();
// const cacheDeviceMap: Record<string, Device> = {};

const Log = getLogger(LoggerNames.DeviceList);

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

    // // find existed device
    // if (connectId) {
    //   const device = cacheDeviceMap[connectId];
    //   if (device) {
    //     const exist = descriptorList.find(d => d.path === device.originalDescriptor.path);
    //     if (exist) {
    //       device.updateDescriptor(exist, true);
    //       Log.debug('find existed Device: ', connectId);
    //       this.devices[connectId] = device;
    //       return [device];
    //     }
    //   }
    // }

    // for await (const descriptor of descriptorList) {
    //   let device = Device.fromDescriptor(descriptor);
    //   device.deviceConnector = this.connector;
    //   await device.connect();
    //   await device.initialize();
    //   await device.release();

    //   // clean session after release
    //   deviceList.push(device);
    //   if (device.features) {
    //     const uuid = getDeviceUUID(device.features);
    //     if (cacheDeviceMap[uuid]) {
    //       const cache = cacheDeviceMap[uuid];
    //       cache?.updateFromCache(device);
    //       device = cache;
    //     }
    //     this.devices[uuid] = device;
    //     cacheDeviceMap[uuid] = device;
    //   }
    // }

    // return deviceList;
  }

  allDevices(): Device[] {
    return Object.keys(this.devices).map(key => this.devices[key]);
  }

  getDevice(connectId: string) {
    return this.devices[connectId];
  }
}
