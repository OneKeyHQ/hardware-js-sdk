import { BaseMethod } from './BaseMethod';
import DeviceConnector from '../device/DeviceConnector';
import TransportManager from '../data-manager/TransportManager';
import { Device } from '../device/Device';
import { DataManager } from '../data-manager';
import { getDeviceTypeByBleName } from '../utils';

export default class SearchDevices extends BaseMethod {
  connector?: DeviceConnector;

  init() {
    this.useDevice = false;
  }

  async run() {
    await TransportManager.configure();
    const deviceDiff = await this.connector?.enumerate();
    const devicesDescriptor = deviceDiff?.descriptors ?? [];

    const env = DataManager.getSettings('env');

    /**
     * No need to call features during Bluetooth scaning
     * to avoid device pairing
     */
    if (env === 'react-native') {
      return devicesDescriptor.map(device => ({
        ...device,
        connectId: device.id,
        deviceType: getDeviceTypeByBleName(device.name ?? ''),
      }));
    }

    const devices = [];
    for await (const descriptor of devicesDescriptor) {
      const device = Device.fromDescriptor(descriptor);
      device.deviceConnector = this.connector;
      await device.connect();
      await device.initialize();
      await device.release();
      devices.push(device);
    }
    return devices.map(device => device.toMessageObject());
  }
}
