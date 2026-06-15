import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { IDeviceType } from './device';

export type transportEnv =
  | 'node'
  | 'web'
  | 'webextension'
  | 'electron'
  | 'react-native'
  | 'webusb'
  | 'desktop-webusb'
  | 'desktop-web-ble'
  | 'emulator'
  | 'lowlevel'
  | 'node-usb';
export type ConnectSettings = {
  connectSrc?: string;
  debug?: boolean;
  transportReconnect?: boolean;
  lazyLoad?: boolean;
  // internal part, not to be accepted from .init()
  origin?: string;
  parentOrigin?: string; // parent window origin
  configSrc: string;
  iframeSrc: string;
  version: string;
  priority: number;
  trustedHost: boolean;
  supportedBrowser?: boolean;
  env: transportEnv;
  timestamp: number;
  isFrame?: boolean;
  preRelease?: boolean;
  fetchConfig?: boolean;
  extension?: string;
  configFetcher?: (url: string) => Promise<RemoteConfigResponse | null>;
  /**
   * 临时开关：Protocol V2 DevGetDeviceInfo 未稳定前用于 mock 设备信息。
   * 正式 app 可显式设置为 false 以调用真实 DevGetDeviceInfo；固件稳定后删除。
   */
  protocolV2DeviceInfoMockEnabled?: boolean;
};

export type IVersionArray = [number, number, number];

export type ILocale = 'zh-CN' | 'en-US';

/** STM32 firmware config */
export type IFirmwareReleaseInfo = {
  required: boolean;
  url: string;
  /**
   * Firmware type (bitcoinonly or universal)
   * This field is not present in the remote config, but will be inferred from the firmware field name
   */
  firmwareType?: EFirmwareType;
  /** Firmware UI resource */
  resource?: string;
  /** Firmware full UI resource */
  fullResource?: string;
  fullResourceRange?: string[];
  bootloaderResource?: string;
  bootloaderVersion?: IVersionArray;
  displayBootloaderVersion?: IVersionArray;
  bootloaderRelatedFirmwareVersion?: IVersionArray;
  bootloaderChangelog?: {
    [k in ILocale]: string;
  };
  fingerprint: string;
  version: IVersionArray;
  changelog: {
    [k in ILocale]: string;
  };
};

/** BLE firmware config */
export type IBLEFirmwareReleaseInfo = {
  required: boolean;
  /** bluetooth dfu version */
  url: string;
  /** stm bluetooth update version */
  webUpdate: string;
  fingerprint: string;
  fingerprintWeb: string;
  version: IVersionArray;
  changelog: {
    [k in ILocale]: string;
  };
};

type IKnownDevice = Exclude<IDeviceType, 'unknown' | 'pro2'>;

/**
 * Device firmware configuration map
 *
 * IMPORTANT: This type is used for firmware update logic.
 * - DO NOT remove existing firmware fields
 * - Only ADD new optional firmware fields for new versions
 * - 'firmware' field is required for backward compatibility
 * - 'ble' field is required for BLE firmware updates
 *
 * @example
 * // When adding firmware-v8:
 * // {
 * //   firmware: IFirmwareReleaseInfo[];
 * //   'firmware-v2'?: IFirmwareReleaseInfo[];
 * //   'firmware-v8'?: IFirmwareReleaseInfo[];
 * //   'firmware-v8'?: IFirmwareReleaseInfo[];      // New
 * //   'firmware-btc-v8'?: IFirmwareReleaseInfo[];
 * //   'firmware-btc-v8'?: IFirmwareReleaseInfo[];  // New
 * //   ble: IBLEFirmwareReleaseInfo[];
 * // }
 */
export type DeviceTypeMap = {
  [k in IKnownDevice]: {
    /** Base firmware field (required for backward compatibility) */
    firmware: IFirmwareReleaseInfo[];
    /** Firmware v2 (Touch/Pro specific) */
    'firmware-v2'?: IFirmwareReleaseInfo[];
    /** Universal firmware v7 */
    'firmware-v8'?: IFirmwareReleaseInfo[];
    /** Bitcoin-only firmware v7 */
    'firmware-btc-v8'?: IFirmwareReleaseInfo[];
    // Future firmware versions should be added here as optional fields:
    // 'firmware-v8'?: IFirmwareReleaseInfo[];
    // 'firmware-btc-v8'?: IFirmwareReleaseInfo[];
    /** BLE firmware (required) */
    ble: IBLEFirmwareReleaseInfo[];
  };
};

export type AssetsMap = {
  bridge: {
    version: IVersionArray;
    linux32Rpm: string;
    linux64Rpm: string;
    linux32Deb: string;
    linux64Deb: string;
    win: string;
    mac: string;
    sha256sumAsc: string;
    changelog: {
      [k in ILocale]: string;
    };
  };
};

export type RemoteConfigResponse = {
  bridge: AssetsMap['bridge'];
} & DeviceTypeMap;
