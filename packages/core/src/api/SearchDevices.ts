import { EDeviceType, canonicalizePro2BleAdvertisementName } from '@onekeyfe/hd-shared';

import { BaseMethod } from './BaseMethod';
import TransportManager from '../data-manager/TransportManager';
import { DataManager } from '../data-manager';
import { LoggerNames, getDeviceTypeByBleName, getLogger } from '../utils';
import { DevicePool } from '../device/DevicePool';

import type { SearchDevice } from '../types/device';
import type DeviceConnector from '../device/DeviceConnector';
import type { OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';
import type { Device } from '../device/Device';

const Log = getLogger(LoggerNames.DevicePool);

type RequestQueueLookup = {
  getRequestTasksIdByConnectId: (connectId: string) => number[];
};

const isOwnedByActiveWebUsbRequest = (
  descriptor: DeviceDescriptor,
  requestQueue?: RequestQueueLookup
) => {
  if (!requestQueue) return false;
  const keys = [descriptor.path, descriptor.id].filter(
    (key): key is string => typeof key === 'string' && key.length > 0
  );
  return keys.some(key => requestQueue.getRequestTasksIdByConnectId(key).length > 0);
};

const toSearchDeviceFromDescriptor = (descriptor: DeviceDescriptor): SearchDevice => {
  const connectId = descriptor.path || descriptor.id || null;
  return {
    connectId,
    uuid: connectId ?? '',
    serialNo: connectId,
    deviceId: null,
    deviceType: EDeviceType.Unknown,
    name: descriptor.name || connectId || '',
    commType: descriptor.commType,
  };
};

const toSearchDevice = (device: Device): SearchDevice | null => {
  const message = device.toMessageObject();
  return message ? (message as SearchDevice) : null;
};

export default class SearchDevices extends BaseMethod {
  connector?: DeviceConnector;

  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run(): Promise<SearchDevice[]> {
    const env = DataManager.getSettings('env');
    const isWebUsb = env === 'webusb' || env === 'desktop-webusb';
    const requestQueue = this.context?.requestQueue;
    const hasActiveWebUsbRequest = isWebUsb && (requestQueue?.getRequestTasksId().length ?? 0) > 0;
    // Bring up WebUSB even when schema configuration is deferred while a
    // business request owns the discovery lock. Failures here used to be
    // swallowed by configure(); keep searchDevices resolving empty.
    if (isWebUsb) {
      try {
        await TransportManager.ensureInitialized();
      } catch (error) {
        Log.debug('WebUSB bring-up unavailable', error);
      }
    }
    if (!hasActiveWebUsbRequest) await TransportManager.configure();
    const deviceDiff = await this.connector?.enumerate();
    const devicesDescriptor = deviceDiff?.descriptors ?? [];

    /**
     * No need to call features during Bluetooth scaning
     * to avoid device pairing
     */
    if (DataManager.isBleConnect(env)) {
      const devices: SearchDevice[] = [];
      const seenIds = new Set<string>();

      for (const device of devicesDescriptor) {
        const lowerId = device.id?.toLowerCase();
        if (!seenIds.has(lowerId)) {
          seenIds.add(lowerId);
          const rawBleName =
            device.name ?? (device as unknown as { localName?: string }).localName ?? '';
          const bleName = canonicalizePro2BleAdvertisementName(rawBleName);
          devices.push({
            ...device,
            connectId: device.id,
            serialNo: null,
            // BLE discovery cannot provide a physical-device identity before initialization.
            uuid: '',
            deviceId: null,
            name: bleName || device.name,
            deviceType: getDeviceTypeByBleName(bleName),
          });
        }
      }
      return devices;
    }

    const deviceList: SearchDevice[] = [];
    for (const descriptor of devicesDescriptor) {
      if (hasActiveWebUsbRequest && isOwnedByActiveWebUsbRequest(descriptor, requestQueue)) {
        const cached = DevicePool.getDeviceByPath(descriptor.path);
        const message = cached?.features ? toSearchDevice(cached) : null;
        // Do not probe a path an in-flight request already owns. A cache miss
        // (passphrase switch / initSession) is still a connected device.
        deviceList.push(message ?? toSearchDeviceFromDescriptor(descriptor));
      } else {
        try {
          // Discovery is best effort. Browsers may retain WebUSB grants for devices that
          // are offline, busy, or not ready, so one descriptor must not abort the scan.
          const result = await DevicePool.getDevices([descriptor], descriptor.path, {
            // Discovery must actively identify the protocol instead of trusting a caller hint.
            connectProtocol: undefined,
            forceProtocolDetection: true,
            refreshRuntimeState: true,
          });
          for (const device of result.deviceList) {
            const message = toSearchDevice(device);
            if (message) deviceList.push(message);
          }
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
    }

    return deviceList;
  }
}
