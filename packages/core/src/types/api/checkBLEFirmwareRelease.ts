import type { Response } from '../params';
import type { IDeviceFirmwareStatus } from '../device';

export declare function checkBLEFirmwareRelease(
  connectId?: string
): Response<IDeviceFirmwareStatus>;
