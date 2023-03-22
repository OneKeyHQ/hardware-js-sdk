import { BaseMethod } from './BaseMethod';
import DeviceConnector from '../device/DeviceConnector';
import TransportManager from '../data-manager/TransportManager';
import { DataManager } from '../data-manager';
import { getDeviceTypeByBleName } from '../utils';
import { DevicePool } from '../device/DevicePool';

export default class SearchDevices extends BaseMethod {
  connector?: DeviceConnector;

  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
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

    const { deviceList } = await DevicePool.getDevices(devicesDescriptor);
    return deviceList.map(device => device.toMessageObject());
  }
}
