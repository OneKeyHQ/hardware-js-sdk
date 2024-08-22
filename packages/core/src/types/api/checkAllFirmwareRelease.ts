import type { CommonParams, Response } from '../params';
import type { IDeviceBLEFirmwareStatus, IDeviceFirmwareStatus } from '../device';
import { IBLEFirmwareReleaseInfo } from '../settings';

export type FirmwareRelease = {
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

type IPlatform = 'native' | 'desktop' | 'ext' | 'web' | 'webEmbed';

export type CheckAllFirmwareReleaseParams = {
  platform?: IPlatform;
};

export declare function checkAllFirmwareRelease(
  connectId?: string,
  params?: CommonParams & CheckAllFirmwareReleaseParams
): Response<AllFirmwareRelease>;
