import { DebugLinkMemory, DebugLinkMemoryRead } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function debugLinkMemoryRead(
  connectId: string,
  params: CommonParams & DebugLinkMemoryRead
): Response<DebugLinkMemory>;
