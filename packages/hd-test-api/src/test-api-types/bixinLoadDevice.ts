import type { BixinLoadDevice, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function bixinLoadDevice(
  connectId: string,
  deviceId: string,
  params: CommonParams & BixinLoadDevice
): Response<Success>;
