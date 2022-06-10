import { Success } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type DeviceChangePinParams = {
  remove?: boolean;
};

export declare function deviceChangePin(
  params: CommonParams & DeviceChangePinParams
): Response<Success>;
