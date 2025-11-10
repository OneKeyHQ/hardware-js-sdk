import axios from 'axios';
import semver from 'semver';
import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import MessagesJSON from '../data/messages/messages.json';
import MessagesLegacyV1JSON from '../data/messages/messages_legacy_v1.json';
import {
  getDeviceBLEFirmwareVersion,
  getDeviceFirmwareVersion,
  getDeviceType,
  getFirmwareType,
  getFirmwareUpdateField,
  getTimeStamp,
} from '../utils';
import { DeviceModelToTypes } from '../types';
import { findLatestRelease, getReleaseChangelog, getReleaseStatus } from '../utils/release';

import type {
  AssetsMap,
  ConnectSettings,
  DeviceTypeMap,
  Features,
  IDeviceBLEFirmwareStatus,
  IDeviceFirmwareStatus,
  ITransportStatus,
  IVersionArray,
  RemoteConfigResponse,
} from '../types';

export const FIRMWARE_FIELDS = [
  'firmware',
  'firmware-v2',
  'firmware-v7',
  'firmware-btc-v7',
] as const;

export type IFirmwareField = (typeof FIRMWARE_FIELDS)[number];

export type MessageVersion = 'latest' | 'v1';

const FIRMWARE_FIELD_TYPE_MAP: Readonly<Record<IFirmwareField, EFirmwareType>> = {
  firmware: EFirmwareType.Universal,
  'firmware-v2': EFirmwareType.Universal,
  'firmware-v7': EFirmwareType.Universal,
  'firmware-btc-v7': EFirmwareType.BitcoinOnly,
} as const;

function getFirmwareTypeFromField(firmwareField: IFirmwareField): EFirmwareType {
  const firmwareType = FIRMWARE_FIELD_TYPE_MAP[firmwareField];

  // Explicit check for type safety
  if (firmwareType === undefined) {
    // Fallback to Universal for safety
    return EFirmwareType.Universal;
  }

  return firmwareType;
}

export default class DataManager {
  static deviceMap: DeviceTypeMap = {
    [EDeviceType.Classic]: {
      firmware: [],
      ble: [],
    },
    [EDeviceType.Classic1s]: {
      firmware: [],
      ble: [],
    },
    [EDeviceType.Mini]: {
      firmware: [],
      ble: [],
    },
    [EDeviceType.Touch]: {
      firmware: [],
      ble: [],
    },
    [EDeviceType.Pro]: {
      firmware: [],
      ble: [],
    },
    [EDeviceType.ClassicPure]: {
      firmware: [],
      ble: [],
    },
  };

  static assets: AssetsMap | null = null;

  static settings: ConnectSettings;

  static messages: { [version in MessageVersion]: JSON } = {
    latest: MessagesJSON as unknown as JSON,
    v1: MessagesLegacyV1JSON as unknown as JSON,
  };

  static lastCheckTimestamp = 0;

  static getFirmwareStatus = (
    features: Features,
    firmwareType: EFirmwareType
  ): IDeviceFirmwareStatus => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return 'unknown';

    const deviceFirmwareType = getFirmwareType(features);
    const deviceFirmwareVersion = getDeviceFirmwareVersion(features);
    if (features.firmware_present === false) {
      return 'none';
    }

    if (DeviceModelToTypes.model_mini.includes(deviceType) && features.bootloader_mode) {
      return 'unknown';
    }

    const firmwareUpdateField = getFirmwareUpdateField({
      features,
      updateType: 'firmware',
      firmwareType,
    });
    const targetDeviceConfigList = this.deviceMap[deviceType]?.[firmwareUpdateField] ?? [];
    let currentVersion = deviceFirmwareVersion.join('.');
    if (targetDeviceConfigList.length > 0 && deviceFirmwareType !== firmwareType) {
      currentVersion = '0.0.0';
    }
    return getReleaseStatus(targetDeviceConfigList, currentVersion);
  };

  /**
   * Touch、Pro System UI Resource Update
   * ** Interval upgrade is not considered **
   */
  static getSysResourcesLatestRelease = ({
    features,
    forcedUpdateRes,
    firmwareType,
  }: {
    features: Features;
    forcedUpdateRes?: boolean;
    firmwareType: EFirmwareType;
  }) => {
    const deviceType = getDeviceType(features);
    const deviceFirmwareVersion = getDeviceFirmwareVersion(features);

    if (deviceType !== EDeviceType.Pro && deviceType !== EDeviceType.Touch) return undefined;

    const firmwareUpdateField = getFirmwareUpdateField({
      features,
      updateType: 'firmware',
      firmwareType,
    }) as IFirmwareField;
    const targetDeviceConfigList = this.deviceMap[deviceType]?.[firmwareUpdateField] ?? [];
    const currentVersion = deviceFirmwareVersion.join('.');
    const targetDeviceConfig = targetDeviceConfigList.filter(item =>
      forcedUpdateRes
        ? !!item.resource
        : semver.gt(item.version.join('.'), currentVersion) && !!item.resource
    );

    return findLatestRelease(targetDeviceConfig)?.resource;
  };

  /**
   * Touch、Pro System full UI Resource Update
   * ** Interval upgrade is not considered **
   */
  static getSysFullResource = (features: Features, firmwareType: EFirmwareType) => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return undefined;

    if (deviceType !== EDeviceType.Pro && deviceType !== EDeviceType.Touch) return undefined;

    const firmwareUpdateField = getFirmwareUpdateField({
      features,
      updateType: 'firmware',
      firmwareType,
    }) as IFirmwareField;
    const targetDeviceConfigList = this.deviceMap[deviceType]?.[firmwareUpdateField] ?? [];
    const targetDeviceConfig = targetDeviceConfigList.filter(item => !!item.fullResource);

    return findLatestRelease(targetDeviceConfig)?.fullResource;
  };

  static getBootloaderResource = (features: Features, firmwareType: EFirmwareType) => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) throw new Error('Device type is unknown');

    if (deviceType !== EDeviceType.Pro && deviceType !== EDeviceType.Touch) return undefined;
    const firmwareUpdateField = getFirmwareUpdateField({
      features,
      updateType: 'firmware',
      firmwareType,
    }) as IFirmwareField;
    const targetDeviceConfigList = this.deviceMap[deviceType]?.[firmwareUpdateField] ?? [];
    if (targetDeviceConfigList.length === 0) {
      throw new Error(
        `Could not found bootloader resource with deviceType:${deviceType} firmwareUpdateField:${firmwareUpdateField}`
      );
    }
    const targetDeviceConfig = targetDeviceConfigList.filter(item => !!item.bootloaderResource);

    return findLatestRelease(targetDeviceConfig)?.bootloaderResource;
  };

  static getBootloaderTargetVersion = (
    features: Features,
    firmwareType: EFirmwareType
  ): IVersionArray | undefined => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return undefined;

    const firmwareUpdateField = getFirmwareUpdateField({
      features,
      updateType: 'firmware',
      firmwareType,
    }) as IFirmwareField;
    const targetDeviceConfigList = this.deviceMap[deviceType]?.[firmwareUpdateField] ?? [];
    const targetDeviceConfig = targetDeviceConfigList.filter(item => !!item.bootloaderResource);

    return targetDeviceConfig?.[0]?.bootloaderVersion ?? undefined;
  };

  static getBootloaderRelatedFirmwareVersion = (
    features: Features,
    firmwareType: EFirmwareType
  ): IVersionArray | undefined => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return undefined;

    if (!DeviceModelToTypes.model_mini.includes(deviceType)) return undefined;
    const firmwareUpdateField = getFirmwareUpdateField({
      features,
      updateType: 'firmware',
      firmwareType,
    }) as IFirmwareField;
    const targetDeviceConfigList = this.deviceMap[deviceType]?.[firmwareUpdateField] ?? [];
    const targetDeviceConfig = targetDeviceConfigList.filter(
      item => !!item.bootloaderRelatedFirmwareVersion
    );

    return targetDeviceConfig?.[0]?.bootloaderRelatedFirmwareVersion ?? undefined;
  };

  static getFirmwareChangelog = (features: Features, firmwareType: EFirmwareType) => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return [];

    const deviceFirmwareVersion = getDeviceFirmwareVersion(features);

    const firmwareUpdateField = getFirmwareUpdateField({
      features,
      updateType: 'firmware',
      firmwareType,
    }) as IFirmwareField;
    const targetDeviceConfigList = this.deviceMap[deviceType]?.[firmwareUpdateField] ?? [];

    if (
      features.firmware_present === false ||
      (DeviceModelToTypes.model_classic.includes(deviceType) && features.bootloader_mode)
    ) {
      // Always return least changelog
      return getReleaseChangelog(targetDeviceConfigList, '0.0.0');
    }

    const currentVersion = deviceFirmwareVersion.join('.');
    return getReleaseChangelog(targetDeviceConfigList, currentVersion);
  };

  static getFirmwareLatestRelease = (features: Features, firmwareType: EFirmwareType) => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return undefined;

    const firmwareUpdateField = getFirmwareUpdateField({
      features,
      updateType: 'firmware',
      firmwareType,
    }) as IFirmwareField;
    const targetDeviceConfigList = this.deviceMap[deviceType]?.[firmwareUpdateField] ?? [];

    const target = findLatestRelease(targetDeviceConfigList);
    if (!target) return target;

    if (!target.resource) {
      const resource = this.getSysResourcesLatestRelease({ features, firmwareType });
      return {
        ...target,
        resource,
      };
    }
    return target;
  };

  static getBLEFirmwareStatus = (features: Features): IDeviceBLEFirmwareStatus => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return 'unknown';

    const deviceBLEFirmwareVersion = getDeviceBLEFirmwareVersion(features);

    /** mini has no device ble_ver */
    if (!deviceBLEFirmwareVersion) {
      return 'none';
    }

    const targetDeviceConfigList = this.deviceMap[deviceType]?.ble ?? [];
    const currentVersion = deviceBLEFirmwareVersion.join('.');
    return getReleaseStatus(targetDeviceConfigList, currentVersion);
  };

  static getBleFirmwareChangelog = (features: Features) => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return [];

    const deviceBLEFirmwareVersion = getDeviceBLEFirmwareVersion(features);

    if (!deviceBLEFirmwareVersion) {
      return [];
    }

    const targetDeviceConfigList = this.deviceMap[deviceType]?.ble ?? [];
    const currentVersion = deviceBLEFirmwareVersion.join('.');
    return getReleaseChangelog(targetDeviceConfigList, currentVersion);
  };

  static getBleFirmwareLatestRelease = (features: Features) => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return undefined;

    const targetDeviceConfigList = this.deviceMap[deviceType]?.ble ?? [];
    return findLatestRelease(targetDeviceConfigList);
  };

  static getTransportStatus = (localVersion: string): ITransportStatus => {
    const latestTransportVersion = this.assets?.bridge?.version;
    if (!latestTransportVersion) return 'valid';
    const isLatest = semver.gte(localVersion, latestTransportVersion.join('.'));
    return isLatest ? 'valid' : 'outdated';
  };

  static getBridgeChangelog = () => this.assets?.bridge.changelog;

  private static enrichFirmwareReleaseInfo(
    deviceData: DeviceTypeMap[keyof DeviceTypeMap] | undefined
  ): DeviceTypeMap[keyof DeviceTypeMap] {
    // Safety check: return default structure if input is undefined/null
    if (!deviceData || typeof deviceData !== 'object') {
      return {
        firmware: [],
        ble: [],
      };
    }

    // Create a shallow copy to avoid mutating original data
    const enrichedData = { ...deviceData };

    FIRMWARE_FIELDS.forEach(field => {
      const releases = enrichedData[field];

      if (!releases || !Array.isArray(releases) || releases.length === 0) {
        return; // Skip this field
      }

      // Add firmwareType to each release in this field
      try {
        enrichedData[field] = releases.map(release => {
          // Safety checks:
          if (!release || typeof release !== 'object' || !!release.firmwareType) {
            return release; // Return as-is if invalid or already has firmwareType
          }

          const firmwareType = getFirmwareTypeFromField(field);

          return {
            ...release,
            firmwareType,
          };
        });
      } catch (error) {
        console.error(`Error enriching firmware field "${field}":`, error);
      }
    });

    return enrichedData;
  }

  static async load(settings: ConnectSettings) {
    this.settings = settings;
    if (!settings.fetchConfig) {
      return;
    }
    try {
      const url = settings.preRelease
        ? 'https://data.onekey.so/pre-config.json'
        : 'https://data.onekey.so/config.json';

      const { data } = await axios.get<RemoteConfigResponse>(
        `${url}?noCache=${getTimeStamp()}`,
        // because of iframe timeout is 10000
        {
          timeout: 7000,
        }
      );
      this.deviceMap = {
        [EDeviceType.Classic]: this.enrichFirmwareReleaseInfo(data.classic),
        [EDeviceType.Classic1s]: this.enrichFirmwareReleaseInfo(data.classic1s),
        [EDeviceType.ClassicPure]: this.enrichFirmwareReleaseInfo(data.classicpure),
        [EDeviceType.Mini]: this.enrichFirmwareReleaseInfo(data.mini),
        [EDeviceType.Touch]: this.enrichFirmwareReleaseInfo(data.touch),
        [EDeviceType.Pro]: this.enrichFirmwareReleaseInfo(data.pro),
      };
      this.assets = {
        bridge: data.bridge,
      };
    } catch (e) {
      // ignore
    }
  }

  static updateEnv(newEnv: ConnectSettings['env']) {
    if (this.settings) {
      const prevEnv = this.settings.env;
      this.settings = {
        ...this.settings,
        env: newEnv,
      };

      // Log the environment change
      console.debug(`DataManager env updated: ${prevEnv} -> ${newEnv}`);
    }
  }

  static async checkAndReloadData() {
    if (getTimeStamp() - this.lastCheckTimestamp > 1000 * 60 * 60 * 3) {
      await this.load(this.settings).then(() => {
        this.lastCheckTimestamp = getTimeStamp();
      });
    }
  }

  static getProtobufMessages(messageVersion: MessageVersion = 'latest'): JSON {
    return this.messages[messageVersion];
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

  static isBleConnect = (env: ConnectSettings['env']) =>
    env === 'react-native' || env === 'lowlevel' || env === 'desktop-web-ble';

  static isWebUsbConnect = (env: ConnectSettings['env']) => env === 'webusb';
}
