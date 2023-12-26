import { Success, CancelAuthorization } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceCancelAuthorization(
  connectId: string,
  params: CommonParams & CancelAuthorization
): Response<Success>;
