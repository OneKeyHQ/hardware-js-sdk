import type { Response } from '../params';
import type { IDeviceFirmwareStatus } from '../device';
import { IFirmwareReleaseInfo } from '../settings';

type FirmwareRelease = {
  status: IDeviceFirmwareStatus;
  changelog: {
    'en-US': string;
    'zh-CN': string;
  }[];
  release: IFirmwareReleaseInfo;
  bootloaderMode: boolean;
};

export declare function checkFirmwareRelease(connectId?: string): Response<FirmwareRelease>;
