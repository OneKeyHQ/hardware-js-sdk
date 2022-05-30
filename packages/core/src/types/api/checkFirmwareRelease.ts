import type { CommonParams, Response } from '../params';
import type { DeviceFirmwareStatus } from '../device';

export declare function checkFirmwareRelease(params?: CommonParams): Response<DeviceFirmwareStatus>;
