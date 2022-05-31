import type { CommonParams, Response } from '../params';
import type { IDeviceFirmwareStatus } from '../device';

export declare function checkFirmwareRelease(
  params?: CommonParams
): Response<IDeviceFirmwareStatus>;
