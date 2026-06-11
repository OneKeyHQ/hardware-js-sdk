import type { CommonParams, Response } from '../params';
import type { Features, IDeviceType, OnekeyFeatures } from '../device';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { ProtocolType, ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';

// 协议类型单源：从 hd-transport 的 ProtocolType 派生，只额外允许 'unknown'。
export type DeviceInfoProtocol = ProtocolType | 'unknown';

export type DeviceInfoSource = 'features' | 'onekeyFeatures' | 'deviceInfo';

export type DeviceInfoScope = 'basic' | 'versions' | 'verify' | 'full';

export type GetDeviceInfoParams = {
  scope?: DeviceInfoScope;
  refresh?: boolean;
  includeRaw?: boolean;
};

export type DeviceInfoMode = 'normal' | 'bootloader' | 'notInitialized' | 'unknown';

export type DeviceInfoStatus = {
  mode: DeviceInfoMode;
  initialized: boolean | null;
  bootloaderMode: boolean | null;
  unlocked: boolean | null;
  passphraseProtection: boolean | null;
  backupRequired: boolean | null;
  noBackup: boolean | null;
  language: string | null;
  bleEnabled: boolean | null;
};

export type DeviceProfileVersions = {
  firmware: string | null;
  bootloader: string | null;
  board: string | null;
  ble: string | null;
  se01?: string | null;
  se02?: string | null;
  se03?: string | null;
  se04?: string | null;
  se01Boot?: string | null;
  se02Boot?: string | null;
  se03Boot?: string | null;
  se04Boot?: string | null;
};

export type DeviceProfileVerify = {
  firmwareBuildId?: string;
  firmwareHash?: string;
  bootloaderBuildId?: string;
  bootloaderHash?: string;
  boardBuildId?: string;
  boardHash?: string;
  bleBuildId?: string;
  bleHash?: string;
  se01BuildId?: string;
  se01Hash?: string;
  se02BuildId?: string;
  se02Hash?: string;
  se03BuildId?: string;
  se03Hash?: string;
  se04BuildId?: string;
  se04Hash?: string;
  se01BootBuildId?: string;
  se01BootHash?: string;
  se02BootBuildId?: string;
  se02BootHash?: string;
  se03BootBuildId?: string;
  se03BootHash?: string;
  se04BootBuildId?: string;
  se04BootHash?: string;
};

export type DeviceProfileRaw = {
  features?: Features;
  onekeyFeatures?: OnekeyFeatures;
  protocolV2DeviceInfo?: ProtocolV2DeviceInfo;
};

export type DeviceProfile = {
  protocol: DeviceInfoProtocol;
  sources: DeviceInfoSource[];
  deviceType: IDeviceType;
  firmwareType: EFirmwareType;
  deviceId: string;
  serialNo: string;
  label: string | null;
  bleName: string | null;
  status: DeviceInfoStatus;
  versions: DeviceProfileVersions;
  verify?: DeviceProfileVerify;
  raw?: DeviceProfileRaw;
};

export declare function getDeviceInfo(
  connectId?: string,
  params?: CommonParams & GetDeviceInfoParams
): Response<DeviceProfile>;
