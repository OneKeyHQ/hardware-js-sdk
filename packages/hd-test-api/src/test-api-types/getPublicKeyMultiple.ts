import type {
  GetPublicKeyMultiple as HardwareGetPublicKeyMultiple,
  PublicKeyMultiple,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function getPublicKeyMultiple(
  connectId?: string,
  deviceId?: string,
  params?: CommonParams & HardwareGetPublicKeyMultiple
): Response<PublicKeyMultiple>;
