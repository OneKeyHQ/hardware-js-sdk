import type { DebugLinkMemoryWrite, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function debugLinkMemoryWrite(
  connectId: string,
  params: CommonParams & DebugLinkMemoryWrite
): Response<Success>;
