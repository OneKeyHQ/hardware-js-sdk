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
  | 'SE04';

export type IProtocolV2FirmwareComponent = {
  target: IProtocolV2FirmwareComponentTarget;
  url: string;
  /** SHA-256 of the complete okpkg, used after downloading the package. */
  fingerprint?: string;
  /** OKPP payload hash, used to detect same-version package changes. */
  payloadHash?: string;
  version?: IVersionArray;
};

/** Pro2 RESC bundle okpkg descriptor for incremental FileWrite synchronization. */
export type IProtocolV2ResourceBundle = {
  /** Bundle name, such as images, animation, translations, or fonts_roobert. */
  name: string;
  /** Download URL. */
  url: string;
  /** Device target path, such as vol0:/bundles/images/images.okpkg. */
  devicePath: string;
  /** okpkg payload_version used to skip matching content after FileRead. */
  version?: IVersionArray;
  /** okpkg payload_hash used for SHA3-512 comparison after FileRead. */
  payloadHash?: string;
  /** okpkg header_hash used for SHA3-512 comparison after FileRead. */
  headerHash?: string;
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
  /** Pro2 RESC bundles for incremental direct FileWrite synchronization. */
  resourceBundles?: IProtocolV2ResourceBundle[];
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
