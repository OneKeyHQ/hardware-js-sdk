import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { CommonParams, Response } from '../params';
import type { DeviceStateVersions, Features, IDeviceFirmwareStatus } from '../device';
import type {
  IBLEFirmwareReleaseInfo,
  IFirmwareReleaseInfo,
  IProtocolV2FirmwareComponent,
  IProtocolV2FirmwareComponentTarget,
} from '../settings';
import type { FirmwareUpdateV4Target } from './firmwareUpdate';
import type { FirmwareUpdatePlan, FirmwareUpdatePlanForceTarget } from './firmwareUpdatePlan';

export type ProtocolV2ComponentReleaseInfo = IProtocolV2FirmwareComponent & {
  protocol: 'V2';
  configKey: string;
  componentTarget: IProtocolV2FirmwareComponentTarget;
  required: boolean;
  changelog: IFirmwareReleaseInfo['changelog'];
};

export type FirmwareReleaseCheckResult = {
  shouldUpdate?: boolean;
  status: IDeviceFirmwareStatus;
  changelog?: {
    'zh-CN': string;
    'en-US': string;
  }[];
  release:
    | IBLEFirmwareReleaseInfo
    | IFirmwareReleaseInfo
    | ProtocolV2ComponentReleaseInfo
    | undefined;
  bootloaderMode?: boolean;
};

export type BridgeReleaseCheckResult = Omit<FirmwareReleaseCheckResult, 'release'> & {
  release: string | undefined;
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
  firmware: FirmwareReleaseCheckResult;
  ble: FirmwareReleaseCheckResult;
  bootloader?: FirmwareReleaseCheckResult;
  bridge?: BridgeReleaseCheckResult;
  features?: Features;
  protocol?: 'V1' | 'V2';
  deviceType?: 'pro2' | 'neo';
  firmwareType?: EFirmwareType;
  status?: ProtocolV2FirmwareReleaseStatus;
  hasUpgrade?: boolean;
  required?: boolean;
  resourceStatus?: 'valid' | 'outdated' | 'unknown';
  resourceManifestUrl?: string;
  resourcePreparationRequired?: boolean;
  currentVersions?: DeviceStateVersions;
  components?: ProtocolV2FirmwareComponentRelease[];
  targetsToUpdate?: FirmwareUpdateV4Target[];
  release?: IFirmwareReleaseInfo;
  firmwareUpdatePlan?: FirmwareUpdatePlan;
};

export type CheckAllFirmwareReleaseParams = {
  checkBridgeRelease?: boolean;
  checkFirmwareHash?: boolean;
  firmwareType?: EFirmwareType;
  platform?: 'native' | 'desktop' | 'ext' | 'web' | 'web-embed';
  forceUpdateTargets?: FirmwareUpdatePlanForceTarget[];
};

export declare function checkAllFirmwareRelease(
  connectId?: string,
  params?: CommonParams & CheckAllFirmwareReleaseParams
): Response<AllFirmwareRelease>;
