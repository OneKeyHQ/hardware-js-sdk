import type { CommonParams, Response } from '../params';
import type { IDeviceBLEFirmwareStatus, IDeviceFirmwareStatus } from '../device';
import { IBLEFirmwareReleaseInfo } from '../settings';

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
};

export type CheckAllFirmwareReleaseParams = {
  checkBridgeRelease?: boolean;
};

export declare function checkAllFirmwareRelease(
  connectId?: string,
  params?: CommonParams & CheckAllFirmwareReleaseParams
): Response<AllFirmwareRelease>;
