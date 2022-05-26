import { BaseMethod } from './BaseMethod';
import DeviceConnector from '../device/DeviceConnector';
import TransportManager from '../data-manager/TransportManager';
import { Device } from '../device/Device';

export default class SearchDevices extends BaseMethod {
  connector?: DeviceConnector;

  init() {
    this.useDevice = false;
    this.connector = new DeviceConnector();
  }

  async run() {
    await TransportManager.configure();
    const deviceDiff = await this.connector?.enumerate();
    const devicesDescriptor = deviceDiff?.connected ?? [];

    const devices = [];
    for await (const descriptor of devicesDescriptor) {
      const device = Device.fromDescriptor(descriptor);
      device.deviceConnector = this.connector;
      await device.connect();
      await device.getFeatures();
      devices.push(device);
    }
    return devices;
  }
}
