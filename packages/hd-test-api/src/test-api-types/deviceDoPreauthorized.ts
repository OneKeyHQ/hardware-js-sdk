import type { DoPreauthorized, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function deviceDoPreauthorized(
  connectId: string,
  params: CommonParams & DoPreauthorized
): Response<Success>;
