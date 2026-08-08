import type { Response } from '../params';
import type { FirmwareReleaseCheckResult } from './checkAllFirmwareRelease';

export declare function checkBLEFirmwareRelease(
  connectId?: string
): Response<FirmwareReleaseCheckResult>;
