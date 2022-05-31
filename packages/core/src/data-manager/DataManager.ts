import axios from 'axios';
import semver from 'semver';
import MessagesJSON from '../data/messages/messages.json';
import { getTimeStamp } from '../utils';
import {
  getDeviceType,
  getDeviceFirmwareVersion,
  getDeviceBLEFirmwareVersion,
} from '../utils/deviceFeaturesUtils';

import type {
  ConnectSettings,
  DeviceTypeMap,
  AssetsMap,
  RemoteConfigResponse,
  Features,
  IDeviceFirmwareStatus,
  IDeviceBLEFirmwareStatus,
  ITransportStatus,
} from '../types';

export default class DataManager {
  static deviceMap: DeviceTypeMap = {
    classic: {
      firmware: [],
      ble: [],
    },
    mini: {
      firmware: [],
      ble: [],
    },
    touch: {
      firmware: [],
      ble: [],
    },
    pro: {
      firmware: [],
      ble: [],
    },
  };

  static assets: AssetsMap | null = null;

  static settings: ConnectSettings;

  static messages: { default: JSON } = {
    default: MessagesJSON as unknown as JSON,
  };

  static getFirmwareStatus = (features: Features): IDeviceFirmwareStatus => {
    const deviceType = getDeviceType(features);
    const deviceFirmwareVersion = getDeviceFirmwareVersion(features);
    if (features.firmware_present === false) {
      return 'none';
    }

    if (deviceType === 'classic' && features.bootloader_mode) {
      return 'unknown';
    }

    const targetDeviceConfigList = this.deviceMap[deviceType]?.firmware ?? [];
    const latestFirmware = targetDeviceConfigList[targetDeviceConfigList.length - 1];

    if (!latestFirmware) return 'valid';

    const latestVersion = latestFirmware.version.join('.');
    const currentVersion = deviceFirmwareVersion.join('.');

    /** latest is greater or equal current */
    if (semver.gt(latestVersion, currentVersion)) {
      if (latestFirmware.required) return 'required';

      return 'outdated';
    }

    return 'valid';
  };

  static getBLEFirmwareStatus = (features: Features): IDeviceBLEFirmwareStatus => {
    const deviceType = getDeviceType(features);
    const deviceBLEFirmwareVersion = getDeviceBLEFirmwareVersion(features);

    /** mini has no device ble_ver */
    if (!deviceBLEFirmwareVersion) {
      return 'none';
    }

    const targetDeviceConfigList = this.deviceMap[deviceType]?.ble ?? [];
    const latestBLEFirmware = targetDeviceConfigList[targetDeviceConfigList.length - 1];

    if (!latestBLEFirmware) return 'valid';

    const latestVersion = latestBLEFirmware.version.join('.');
    const currentVersion = deviceBLEFirmwareVersion.join('.');

    /** latest is greater or equal current */
    if (semver.gt(latestVersion, currentVersion)) {
      if (latestBLEFirmware.required) return 'required';

      return 'outdated';
    }

    return 'valid';
  };

  static getTransportStatus = (localVersion: string): ITransportStatus => {
    const latestTransportVersion = this.assets?.bridge?.version;
    if (!latestTransportVersion) return 'valid';
    const isLatest = semver.gte(localVersion, latestTransportVersion.join('.'));
    return isLatest ? 'valid' : 'outdated';
  };

  static async load(settings: ConnectSettings) {
    this.settings = settings;
    try {
      const { data } = await axios.get<RemoteConfigResponse>(
        `https://data.onekey.so/config.json?noCache=${getTimeStamp()}`
      );
      this.deviceMap = {
        classic: data.classic,
        mini: data.mini,
        touch: data.touch,
        pro: data.pro,
      };
      this.assets = {
        bridge: data.bridge,
      };
    } catch (e) {
      // ignore
    }
  }

  static getProtobufMessages() {
    return this.messages.default;
  }

  static getSettings(key?: undefined): ConnectSettings;

  static getSettings<T extends keyof ConnectSettings>(key: T): ConnectSettings[T];

  static getSettings(key?: keyof ConnectSettings) {
    if (!this.settings) return null;
    if (typeof key === 'string') {
      return this.settings[key];
    }
    return this.settings;
  }
}
