import type { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';
import type { Response } from '../params';
import type { FirmwareRelease } from './checkAllFirmwareRelease';

export type CheckFirmwareTypeAvailableParams = {
  deviceType: EDeviceType;
  firmwareType: EFirmwareType;
};

export declare function checkFirmwareTypeAvailable(
  params: CheckFirmwareTypeAvailableParams
): Response<FirmwareRelease | undefined>;
