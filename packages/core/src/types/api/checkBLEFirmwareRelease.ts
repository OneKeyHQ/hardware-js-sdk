import type { CommonParams, Response } from '../params';
import type { IDeviceFirmwareStatus } from '../device';

export declare function checkBLEFirmwareRelease(
  params?: CommonParams
): Response<IDeviceFirmwareStatus>;
