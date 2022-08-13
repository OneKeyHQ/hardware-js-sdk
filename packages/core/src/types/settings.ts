import type { IDeviceType } from './device';

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
  env: 'node' | 'web' | 'webextension' | 'electron' | 'react-native' | 'webusb';
  timestamp: number;
  isFrame?: boolean;
};

export type IVersionArray = [number, number, number];

export type ILocale = 'zh-CN' | 'en-US';

/** STM32 firmware config */
export type IFirmwareReleaseInfo = {
  required: boolean;
  url: string;
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

export type DeviceTypeMap = {
  [k in IDeviceType]: {
    firmware: IFirmwareReleaseInfo[];
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
