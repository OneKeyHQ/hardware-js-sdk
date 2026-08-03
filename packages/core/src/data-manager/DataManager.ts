import axios from 'axios';
import semver from 'semver';
import { EDeviceType, EFirmwareType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import MessagesJSON from '../data/messages/messages.json';
import MessagesLegacyV1JSON from '../data/messages/messages_legacy_v1.json';
import MessagesProtocolV2JSON from '../data/messages/messages-protocol-v2.json';
import {
  LoggerNames,
  getDeviceBLEFirmwareVersion,
  getDeviceFirmwareVersion,
  getDeviceType,
  getFirmwareType,
  getFirmwareUpdateField,
  getLogger,
  getTimeStamp,
} from '../utils';
import { DeviceModelToTypes } from '../types';
import { findLatestRelease, getReleaseChangelog, getReleaseStatus } from '../utils/release';
import { parseProtocolV2Resources } from '../protocols/protocol-v2/resources';

import type {
  AssetsMap,
  ConnectSettings,
  DeviceTypeMap,
  Features,
  IDeviceBLEFirmwareStatus,
  IDeviceFirmwareStatus,
  IProtocolV2Resources,
  ITransportStatus,
  IVersionArray,
  RemoteConfigResponse,
} from '../types';

const Log = getLogger(LoggerNames.Core);

export const FIRMWARE_FIELDS = [
  'firmware',
  'firmware-v1',
  'firmware-v2',
  'firmware-v8',
  'firmware-btc-v8',
] as const;

export type IFirmwareField = (typeof FIRMWARE_FIELDS)[number];

export type ProtocolV1MessageSchema = 'v1CurrentSchema' | 'v1LegacySchema';
export type ProtobufMessageSchema = ProtocolV1MessageSchema | 'v2Schema';

const FIRMWARE_FIELD_TYPE_MAP: Readonly<Record<IFirmwareField, EFirmwareType>> = {
  firmware: EFirmwareType.Universal,
  'firmware-v1': EFirmwareType.Universal,
  'firmware-v2': EFirmwareType.Universal,
  'firmware-v8': EFirmwareType.Universal,
  'firmware-btc-v8': EFirmwareType.BitcoinOnly,
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
  static deviceMap: DeviceTypeMap & {
    [k: string]: NonNullable<DeviceTypeMap[keyof DeviceTypeMap]> | undefined;
  } = {
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
    [EDeviceType.Pro2]: {
      firmware: [],
      ble: [],
    },
    [EDeviceType.Neo]: {
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

  static messages: { [schema in ProtobufMessageSchema]: JSON } = {
    v1CurrentSchema: MessagesJSON as unknown as JSON,
    v1LegacySchema: MessagesLegacyV1JSON as unknown as JSON,
    v2Schema: MessagesProtocolV2JSON as unknown as JSON,
  };

  static lastCheckTimestamp = 0;

  static protocolV2ResourcesConfigError: Error | undefined;

  static getFirmwareStatus = (
    features: Features,
    firmwareType: EFirmwareType
  ): IDeviceFirmwareStatus => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return 'unknown';

    const deviceFirmwareType = getFirmwareType(features);
    const deviceFirmwareVersion = getDeviceFirmwareVersion(features);
    if (features.firmwarePresent === false) {
      return 'none';
    }

    if (DeviceModelToTypes.model_mini.includes(deviceType) && features.bootloaderMode) {
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
      features.firmwarePresent === false ||
      (DeviceModelToTypes.model_classic.includes(deviceType) && features.bootloaderMode)
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

    const deviceBleFirmwareVersion = getDeviceBLEFirmwareVersion(features);

    /** mini has no device ble_ver */
    if (!deviceBleFirmwareVersion) {
      return 'none';
    }

    const targetDeviceConfigList = this.deviceMap[deviceType]?.ble ?? [];
    const currentVersion = deviceBleFirmwareVersion.join('.');
    return getReleaseStatus(targetDeviceConfigList, currentVersion);
  };

  static getBleFirmwareChangelog = (features: Features) => {
    const deviceType = getDeviceType(features);
    if (deviceType === EDeviceType.Unknown) return [];

    const deviceBleFirmwareVersion = getDeviceBLEFirmwareVersion(features);

    if (!deviceBleFirmwareVersion) {
      return [];
    }

    const targetDeviceConfigList = this.deviceMap[deviceType]?.ble ?? [];
    const currentVersion = deviceBleFirmwareVersion.join('.');
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
  ): NonNullable<DeviceTypeMap[keyof DeviceTypeMap]> {
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

  static async load(settings: ConnectSettings): Promise<boolean> {
    this.settings = settings;
    this.protocolV2ResourcesConfigError = undefined;
    if (!settings.fetchConfig) {
      return false;
    }

    const url = settings.preRelease
      ? 'https://data.onekey.so/pre-config.json'
      : 'https://data.onekey.so/config.json';

    const urlWithCache = `${url}?noCache=${getTimeStamp()}`;
    let data: RemoteConfigResponse | null = null;
    let fetchMethod: 'configFetcher' | 'axios' | 'none' = 'none';

    // 1. Try custom configFetcher first (client-side IP direct connection support)
    if (settings.configFetcher) {
      Log.debug('[DataConfig] Trying configFetcher (client-side fetcher)...');
      try {
        data = await settings.configFetcher(urlWithCache);
        if (data) {
          fetchMethod = 'configFetcher';
          Log.log('[DataConfig] ConfigFetcher success');
        } else {
          Log.debug('[DataConfig] ConfigFetcher returned null, will fallback to axios');
        }
      } catch (e) {
        Log.warn('[DataConfig] ConfigFetcher error, will fallback to axios:', e);
      }
    }

    // 2. Fallback to default axios request
    if (!data) {
      Log.debug('[DataConfig] Trying axios (SDK default fetcher)...');
      try {
        const response = await axios.get<RemoteConfigResponse>(urlWithCache, {
          // because of iframe timeout is 10000
          timeout: 7000,
        });
        data = response.data;
        fetchMethod = 'axios';
        Log.log('[DataConfig] Axios fetch success');
      } catch (e) {
        Log.warn('[DataConfig] Axios fetch error:', e);
      }
    }

    // 3. Apply config if available
    if (data) {
      let pro2Resources: IProtocolV2Resources | undefined;
      let neoResources: IProtocolV2Resources | undefined;
      this.protocolV2ResourcesConfigError = undefined;
      try {
        pro2Resources = parseProtocolV2Resources(
          (data.pro2 as { resources?: unknown } | undefined)?.resources
        );
        neoResources = parseProtocolV2Resources(
          (data.neo as { resources?: unknown } | undefined)?.resources
        );
      } catch (error) {
        // Firmware resource metadata is not required for base communication. If the
        // remote config is temporarily incomplete, disable this resource update only.
        this.protocolV2ResourcesConfigError =
          error instanceof Error ? error : new Error(String(error));
        Log.warn('[DataConfig] Ignoring invalid Pro2 resources config:', error);
      }
      const enrichedPro2Config = this.enrichFirmwareReleaseInfo(data.pro2);
      const enrichedNeoConfig = this.enrichFirmwareReleaseInfo(data.neo);
      const { resources: _unvalidatedResources, ...pro2Config } = enrichedPro2Config;
      const { resources: _unvalidatedNeoResources, ...neoConfig } = enrichedNeoConfig;
      Log.log(`[DataConfig] Config loaded successfully via [${fetchMethod}]`);
      this.deviceMap = {
        [EDeviceType.Classic]: this.enrichFirmwareReleaseInfo(data.classic),
        [EDeviceType.Classic1s]: this.enrichFirmwareReleaseInfo(data.classic1s),
        [EDeviceType.ClassicPure]: this.enrichFirmwareReleaseInfo(data.classicpure),
        [EDeviceType.Mini]: this.enrichFirmwareReleaseInfo(data.mini),
        [EDeviceType.Touch]: this.enrichFirmwareReleaseInfo(data.touch),
        [EDeviceType.Pro]: this.enrichFirmwareReleaseInfo(data.pro),
        [EDeviceType.Pro2]: {
          ...pro2Config,
          ...(pro2Resources ? { resources: pro2Resources } : undefined),
        },
        [EDeviceType.Neo]: {
          ...neoConfig,
          ...(neoResources ? { resources: neoResources } : undefined),
        },
      };
      this.assets = {
        bridge: data.bridge,
      };
      return true;
    }
    Log.warn('[DataConfig] All fetch methods failed, using built-in default config');
    return false;
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
      const loaded = await this.load(this.settings);
      if (loaded) {
        this.lastCheckTimestamp = getTimeStamp();
      }
    }
  }

  /** Force a fresh remote config before an update is allowed to mutate the device. */
  static async forceReloadData({
    requireResources = false,
  }: { requireResources?: boolean } = {}): Promise<void> {
    if (!this.settings) {
      throw new Error('Remote config settings are not initialized');
    }
    const loaded = await this.load(this.settings);
    if (!loaded) {
      throw ERRORS.TypedError(
        HardwareErrorCode.NetworkError,
        'Unable to refresh the latest remote config'
      );
    }
    if (requireResources && this.protocolV2ResourcesConfigError) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        `Invalid Pro2 resources config: ${this.protocolV2ResourcesConfigError.message}`
      );
    }
    this.lastCheckTimestamp = getTimeStamp();
  }

  static getProtocolV2Resources(deviceType: EDeviceType.Pro2 | EDeviceType.Neo = EDeviceType.Pro2) {
    return this.deviceMap[deviceType]?.resources?.stable;
  }

  static getProtocolV2BootResources(
    deviceType: EDeviceType.Pro2 | EDeviceType.Neo = EDeviceType.Pro2
  ) {
    return this.deviceMap[deviceType]?.resources?.boot;
  }

  static getProtocolV2BootResources() {
    return this.deviceMap[EDeviceType.Pro2]?.resources?.boot;
  }

  static getProtobufMessages(schema: ProtobufMessageSchema = 'v1CurrentSchema'): JSON {
    return this.messages[schema];
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

  /** Desktop WebUSB doesn't need browser permission prompt */
  static isDesktopWebUsb = (env: ConnectSettings['env']) => env === 'desktop-webusb';

  /** Browser WebUSB needs permission prompt */
  static isBrowserWebUsb = (env: ConnectSettings['env']) => env === 'webusb';
}
