import { BaseMethod } from './BaseMethod';
import TransportManager from '../data-manager/TransportManager';
import { DataManager } from '../data-manager';
import { getDeviceTypeByBleName } from '../utils';
import { DevicePool } from '../device/DevicePool';

import type DeviceConnector from '../device/DeviceConnector';

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
          const bleName =
            device.name ?? (device as unknown as { localName?: string }).localName ?? '';
          devices.push({
            ...device,
            connectId: device.id,
            name: bleName || device.name,
            deviceType: getDeviceTypeByBleName(bleName),
          });
        }
      }
      return devices;
    }

    const { deviceList } = await DevicePool.getDevices(devicesDescriptor, undefined, {
      connectProtocol: this.payload.connectProtocol,
    });
    return deviceList.map(device => device.toMessageObject());
  }
}
