import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { CommonParams, Response } from '../params';
import type { FirmwareReleaseCheckResult } from './checkAllFirmwareRelease';

export type CheckBootloaderReleaseResponse = FirmwareReleaseCheckResult;

export type CheckBootloaderReleaseParams = {
  willUpdateFirmwareVersion?: string;
  firmwareType?: EFirmwareType;
};

export declare function checkBootloaderRelease(
  connectId?: string,
  params?: CommonParams & CheckBootloaderReleaseParams
): Response<CheckBootloaderReleaseResponse>;
