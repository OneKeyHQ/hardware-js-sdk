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
};

export type IVersionArray = [number, number, number];

export type ILocale = 'zh-CN' | 'en-US';

export type IProtocolV2FirmwareComponentTarget =
  | 'ROMLOADER'
  | 'BOOTLOADER'
  | 'APPLICATION_P1'
  | 'APPLICATION_P2'
  | 'COPROCESSOR'
  | 'SE01'
  | 'SE02'
  | 'SE03'
  | 'SE04'
  | 'CRATE'
  | 'RESOURCE';

export type IProtocolV2FirmwareComponent = {
  target: IProtocolV2FirmwareComponentTarget;
  url: string;
  fingerprint?: string;
  version?: IVersionArray;
};

export type IProtocolV2ResourceManifestPackage = {
  name?: string;
  path: string;
  type?: string;
  version?: IVersionArray;
  sha256?: string;
  payloadHash?: string;
  headerHash?: string;
};

export type IProtocolV2ResourceManifest = {
  format?: 'okpkg-crate' | string;
  target?: 'CRATE' | 'RESOURCE' | string;
  version?: IVersionArray;
  packages: IProtocolV2ResourceManifestPackage[];
};

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
  upgradeType?: 'payload-package-set' | string;
  components?: Record<string, IProtocolV2FirmwareComponent>;
  installOrder?: string[];
  resourceManifest?: IProtocolV2ResourceManifest;
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

type IKnownDevice = Exclude<IDeviceType, 'unknown'>;

export type DeviceTypeMap = {
  [k in IKnownDevice]: {
    firmware: IFirmwareReleaseInfo[];
    /** Pro2 Protocol V2 payload package set */
    'firmware-v1'?: IFirmwareReleaseInfo[];
    'firmware-v2'?: IFirmwareReleaseInfo[];
    'firmware-v8'?: IFirmwareReleaseInfo[];
    'firmware-btc-v8'?: IFirmwareReleaseInfo[];
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
