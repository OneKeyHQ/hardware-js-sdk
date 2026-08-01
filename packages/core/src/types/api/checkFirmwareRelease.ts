import type { IFirmwareReleaseInfo } from '../settings';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { Response } from '../params';
import type { IDeviceFirmwareStatus } from '../device';

type FirmwareRelease = {
  status: IDeviceFirmwareStatus;
  changelog: {
    'en-US': string;
    'zh-CN': string;
  }[];
  release: IFirmwareReleaseInfo;
  bootloaderMode: boolean;
};

export type CheckFirmwareReleaseParams = {
  firmwareType?: EFirmwareType;
};

export declare function checkFirmwareRelease(
  connectId?: string,
  params?: CheckFirmwareReleaseParams
): Response<FirmwareRelease>;
