import type { ChangeWipeCode, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function deviceChangeWipeCode(
  connectId: string,
  params: CommonParams & ChangeWipeCode
): Response<Success>;
