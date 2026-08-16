import type { BixinVerifyDeviceAck, BixinVerifyDeviceRequest } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function bixinVerifyDeviceRequest(
  connectId: string,
  deviceId: string,
  params: CommonParams & BixinVerifyDeviceRequest
): Response<BixinVerifyDeviceAck>;
