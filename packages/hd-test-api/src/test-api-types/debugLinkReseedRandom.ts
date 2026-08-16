import type { DebugLinkReseedRandom, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function debugLinkReseedRandom(
  connectId: string,
  params: CommonParams & DebugLinkReseedRandom
): Response<Success>;
