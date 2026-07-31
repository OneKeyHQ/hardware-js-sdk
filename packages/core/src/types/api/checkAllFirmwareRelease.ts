import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { CommonParams, Response } from '../params';
import type {
  DeviceStateVersions,
  Features,
  IDeviceBLEFirmwareStatus,
  IDeviceFirmwareStatus,
} from '../device';
import type {
  IBLEFirmwareReleaseInfo,
  IFirmwareReleaseInfo,
  IProtocolV2FirmwareComponentTarget,
} from '../settings';
import type { FirmwareUpdateV4Target } from './firmwareUpdate';

export type FirmwareRelease = {
  shouldUpdate?: boolean;
  status: IDeviceFirmwareStatus;
  changelog?: {
    'zh-CN': string;
    'en-US': string;
  }[];
  release: IDeviceBLEFirmwareStatus | IBLEFirmwareReleaseInfo | IFirmwareReleaseInfo;
  bootloaderMode?: boolean;
};

export type ProtocolV2FirmwareComponentReleaseStatus =
  | 'valid'
  | 'outdated'
  | 'unknown'
  | 'unsupported';

export type ProtocolV2FirmwareReleaseStatus =
  | 'unavailable'
  | 'valid'
  | 'unknown'
  | 'outdated'
  | 'required';

export type ProtocolV2FirmwareComponentRelease = {
  configKey: string;
  componentTarget: IProtocolV2FirmwareComponentTarget;
  updateTarget: FirmwareUpdateV4Target | null;
  currentVersion: string | null;
  targetVersion: string | null;
  status: ProtocolV2FirmwareComponentReleaseStatus;
  required: boolean;
};

export type AllFirmwareRelease = {
  firmware: FirmwareRelease;
  ble: FirmwareRelease;
  bootloader?: FirmwareRelease;
  bridge?: FirmwareRelease;
  features?: Features;
  protocol?: 'V1' | 'V2';
  deviceType?: 'pro2';
  firmwareType?: EFirmwareType;
  status?: ProtocolV2FirmwareReleaseStatus;
  hasUpgrade?: boolean;
  required?: boolean;
  currentVersions?: DeviceStateVersions;
  components?: ProtocolV2FirmwareComponentRelease[];
  targetsToUpdate?: FirmwareUpdateV4Target[];
  release?: IFirmwareReleaseInfo;
};

export type CheckAllFirmwareReleaseParams = {
  checkBridgeRelease?: boolean;
  firmwareType?: EFirmwareType;
};

export declare function checkAllFirmwareRelease(
  connectId?: string,
  params?: CommonParams & CheckAllFirmwareReleaseParams
): Response<AllFirmwareRelease>;
