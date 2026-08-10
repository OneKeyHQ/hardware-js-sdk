import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { Response } from '../params';
import type { FirmwareReleaseCheckResult } from './checkAllFirmwareRelease';

export type CheckFirmwareReleaseParams = {
  firmwareType?: EFirmwareType;
};

export declare function checkFirmwareRelease(
  connectId?: string,
  params?: CheckFirmwareReleaseParams
): Response<FirmwareReleaseCheckResult | null>;
