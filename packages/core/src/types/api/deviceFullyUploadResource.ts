import type { Success } from '@onekeyfe/hd-transport';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { CommonParams, Response } from '../params';
import type { PreparedPlan } from '../../firmware-update';

export type DeviceFullyUploadResourceParams = {
  binary?: ArrayBuffer;
  firmwareType?: EFirmwareType;
  preparedPlan?: PreparedPlan;
};

export declare function deviceFullyUploadResource(
  connectId: string,
  params: CommonParams & DeviceFullyUploadResourceParams
): Response<Success>;
