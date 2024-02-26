import { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function bixinBackupDevice(
  connectId: string,
  deviceId: string,
  params: CommonParams
): Response<Success>;
