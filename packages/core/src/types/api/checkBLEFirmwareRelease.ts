import type { CommonParams, Response } from '../params';
import type { DeviceFirmwareStatus } from '../device';

export declare function checkBLEFirmwareRelease(
  params?: CommonParams
): Response<DeviceFirmwareStatus>;
