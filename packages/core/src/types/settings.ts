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
  firmwareManifestMode?: 'sdk-managed' | 'external-only';
  preloadedConfig?: RemoteConfigResponse;
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
  expectedSize?: number;
  version?: IVersionArray;
};

export type IProtocolV2ResourceSource = {
  archiveUrl: string;
  archiveSha256: string;
  archiveSize: number;
};

export type IProtocolV2Resources = {
  source: IProtocolV2ResourceSource;
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
  resourceFingerprint?: string;
  resourceExpectedSize?: number;
  /** Firmware full UI resource */
  fullResource?: string;
  fullResourceFingerprint?: string;
  fullResourceExpectedSize?: number;
  fullResourceRange?: string[];
  bootloaderResource?: string;
  bootloaderFingerprint?: string;
  bootloaderExpectedSize?: number;
  bootloaderVersion?: IVersionArray;
  displayBootloaderVersion?: IVersionArray;
  bootloaderRelatedFirmwareVersion?: IVersionArray;
  upgradeType?: 'payload-package-set' | string;
  components?: Record<string, IProtocolV2FirmwareComponent>;
  installOrder?: string[];
  /** Protocol V2 resources matched to this firmware release. */
  resources?: IProtocolV2Resources;
  bootloaderChangelog?: {
    [k in ILocale]: string;
  };
  fingerprint: string;
  expectedSize?: number;
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
  expectedSize?: number;
  version: IVersionArray;
  changelog: {
    [k in ILocale]: string;
  };
};

type IKnownDevice = Exclude<IDeviceType, 'unknown'>;
type IDeviceReleaseInfo = {
  firmware?: IFirmwareReleaseInfo[];
  /** Protocol V2 payload package set */
  'firmware-v1'?: IFirmwareReleaseInfo[];
  'firmware-v2'?: IFirmwareReleaseInfo[];
  'firmware-v8'?: IFirmwareReleaseInfo[];
  'firmware-btc-v8'?: IFirmwareReleaseInfo[];
  ble?: IBLEFirmwareReleaseInfo[];
};

export type DeviceTypeMap = {
  [k in Exclude<IKnownDevice, 'neo'>]: IDeviceReleaseInfo;
} & {
  /** Optional until every remote-config producer publishes a Neo entry. */
  neo?: IDeviceReleaseInfo;
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
