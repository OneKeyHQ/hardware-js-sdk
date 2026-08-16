import type { CancelAuthorization, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function deviceCancelAuthorization(
  connectId: string,
  params: CommonParams & CancelAuthorization
): Response<Success>;
