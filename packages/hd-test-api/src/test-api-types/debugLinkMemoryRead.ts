import type { DebugLinkMemory, DebugLinkMemoryRead } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function debugLinkMemoryRead(
  connectId: string,
  params: CommonParams & DebugLinkMemoryRead
): Response<DebugLinkMemory>;
