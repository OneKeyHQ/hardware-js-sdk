import { Success, DebugLinkMemoryWrite } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function debugLinkMemoryWrite(
  connectId: string,
  params: CommonParams & DebugLinkMemoryWrite
): Response<Success>;
