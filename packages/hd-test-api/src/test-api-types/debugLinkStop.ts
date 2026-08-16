import type { DebugLinkGetState, DebugLinkState } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function debugLinkStop(
  connectId: string,
  params: CommonParams & DebugLinkGetState
): Response<DebugLinkState>;
