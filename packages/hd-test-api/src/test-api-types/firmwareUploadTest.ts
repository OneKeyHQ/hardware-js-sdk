import type { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function firmwareUploadTest(
  connectId: string,
  params: CommonParams
): Response<Success>;
