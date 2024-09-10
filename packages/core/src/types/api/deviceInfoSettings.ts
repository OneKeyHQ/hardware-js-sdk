import { DeviceInfoSettings, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceInfoSettings(
  connectId: string,
  params: CommonParams & DeviceInfoSettings
): Response<Success>;
