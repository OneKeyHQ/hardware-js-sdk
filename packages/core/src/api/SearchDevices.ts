import { BaseMethod } from './BaseMethod';
import TransportManager from '../data-manager/TransportManager';
import { DataManager } from '../data-manager';
import { LoggerNames, getDeviceTypeByBleName, getLogger } from '../utils';
import { DevicePool } from '../device/DevicePool';

import type DeviceConnector from '../device/DeviceConnector';

const Log = getLogger(LoggerNames.DevicePool);

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

    const deviceList = [];
    for (const descriptor of devicesDescriptor) {
      try {
        // Discovery is best effort. Browsers may retain WebUSB grants for devices that
        // are offline, busy, or not ready, so one descriptor must not abort the scan.
        const result = await DevicePool.getDevices([descriptor], descriptor.path, {
          connectProtocol: this.payload.connectProtocol,
          refreshRuntimeState: true,
        });
        deviceList.push(...result.deviceList);
      } catch (error) {
        const errorCode =
          error && typeof error === 'object' && 'errorCode' in error
            ? (error as { errorCode?: unknown }).errorCode
            : undefined;
        Log.debug('Skip unavailable device during search', {
          path: descriptor.path,
          ...(errorCode !== undefined ? { errorCode } : {}),
        });
      }
    }

    return deviceList.map(device => device.toMessageObject());
  }
}
