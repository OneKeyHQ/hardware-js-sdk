import {
  PublicKeyMultiple,
  GetPublicKeyMultiple as HardwareGetPublicKeyMultiple,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function getPublicKeyMultiple(
  connectId?: string,
  deviceId?: string,
  params?: CommonParams & HardwareGetPublicKeyMultiple
): Response<PublicKeyMultiple>;
