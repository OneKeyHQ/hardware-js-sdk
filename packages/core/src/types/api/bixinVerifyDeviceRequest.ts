import { BixinVerifyDeviceAck, BixinVerifyDeviceRequest } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function bixinVerifyDeviceRequest(
  connectId: string,
  deviceId: string,
  params: CommonParams & BixinVerifyDeviceRequest
): Response<BixinVerifyDeviceAck>;
