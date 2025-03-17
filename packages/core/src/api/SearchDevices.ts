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
    if (DataManager.isBleConnect(env)) {
      const devices = [];
      const seenIds = new Set<string>();

      for (const device of devicesDescriptor) {
        const lowerId = device.id?.toLowerCase();
        if (!seenIds.has(lowerId)) {
          seenIds.add(lowerId);
          devices.push({
            ...device,
            connectId: device.id,
            deviceType: getDeviceTypeByBleName(device.name ?? ''),
          });
        }
      }
      return devices;
    }

    const { deviceList } = await DevicePool.getDevices(devicesDescriptor);
    return deviceList.map(device => device.toMessageObject());
  }
}
