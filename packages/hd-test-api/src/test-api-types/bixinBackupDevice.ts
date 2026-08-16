import type { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function bixinBackupDevice(
  connectId: string,
  deviceId: string,
  params: CommonParams
): Response<Success>;
