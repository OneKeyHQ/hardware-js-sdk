import type { SdProtect, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function deviceSdProtect(
  connectId: string,
  params: CommonParams & SdProtect
): Response<Success>;
