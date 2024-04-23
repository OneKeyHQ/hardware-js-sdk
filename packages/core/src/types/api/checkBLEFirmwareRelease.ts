import type { Response } from '../params';
import type { IDeviceBLEFirmwareStatus } from '../device';
import { IBLEFirmwareReleaseInfo } from '../settings';

type BleFirmwareRelease = {
  status: IDeviceBLEFirmwareStatus;
  changelog: {
    'zh-CN': string;
    'en-US': string;
  }[];
  release: IBLEFirmwareReleaseInfo;
  bootloaderMode: boolean;
};

export declare function checkBLEFirmwareRelease(connectId?: string): Response<BleFirmwareRelease>;
