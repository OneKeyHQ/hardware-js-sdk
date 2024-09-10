import { Success, BixinLoadDevice } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function bixinLoadDevice(
  connectId: string,
  deviceId: string,
  params: CommonParams & BixinLoadDevice
): Response<Success>;
