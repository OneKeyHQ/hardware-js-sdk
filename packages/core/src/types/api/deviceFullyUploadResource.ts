import type { Success } from '@onekeyfe/hd-transport';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { CommonParams, Response } from '../params';

export type DeviceFullyUploadResourceParams = {
  binary?: ArrayBuffer;
  firmwareType?: EFirmwareType;
};

export declare function deviceFullyUploadResource(
  connectId: string,
  params: CommonParams & {
    binary?: ArrayBuffer;
  }
): Response<Success>;
