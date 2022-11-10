import { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DeviceChangePinParams = {
  remove?: boolean;
};

export declare function deviceChangePin(
  connectId: string,
  params: CommonParams & DeviceChangePinParams
): Response<Success>;
