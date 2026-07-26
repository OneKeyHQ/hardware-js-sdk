import type { Success } from '@onekeyfe/hd-transport';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { Response } from '../params';
import type { PreparedPlan } from '../../firmware-update';

export type DeviceUpdateBootloaderParams = {
  binary?: ArrayBuffer;
  firmwareType?: EFirmwareType;
  preparedPlan?: PreparedPlan;
};

export declare function deviceUpdateBootloader(
  connectId: string,
  params?: DeviceUpdateBootloaderParams
): Response<Success>;
