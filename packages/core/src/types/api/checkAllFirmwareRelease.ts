import type { IBLEFirmwareReleaseInfo } from '../settings';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { CommonParams, Response } from '../params';
import type { Features, IDeviceBLEFirmwareStatus, IDeviceFirmwareStatus } from '../device';

export type FirmwareRelease = {
  shouldUpdate?: boolean;
  status: IDeviceFirmwareStatus;
  changelog?: {
    'zh-CN': string;
    'en-US': string;
  }[];
  release: IDeviceBLEFirmwareStatus | IBLEFirmwareReleaseInfo;
  bootloaderMode?: boolean;
};

export type AllFirmwareRelease = {
  firmware: FirmwareRelease;
  ble: FirmwareRelease;
  bootloader?: FirmwareRelease;
  bridge?: FirmwareRelease;
  features?: Features;
};

export type CheckAllFirmwareReleaseParams = {
  checkBridgeRelease?: boolean;
  firmwareType?: EFirmwareType;
};

export declare function checkAllFirmwareRelease(
  connectId?: string,
  params?: CommonParams & CheckAllFirmwareReleaseParams
): Response<AllFirmwareRelease>;
