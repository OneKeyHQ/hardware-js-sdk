import type { Success } from '@onekeyfe/hd-transport';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { Response } from '../params';

export type DeviceUpdateBootloaderParams = {
  binary?: ArrayBuffer;
  firmwareType?: EFirmwareType;
};

export declare function deviceUpdateBootloader(
  connectId: string,
  params?: DeviceUpdateBootloaderParams
): Response<Success>;
