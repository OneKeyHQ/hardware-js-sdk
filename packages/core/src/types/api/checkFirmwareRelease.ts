import type { Response } from '../params';
import type { IDeviceFirmwareStatus } from '../device';

export declare function checkFirmwareRelease(connectId?: string): Response<IDeviceFirmwareStatus>;
