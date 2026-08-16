import type { DebugLinkGetState, DebugLinkLog } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function debugLinkGetState(
  connectId: string,
  params: CommonParams & DebugLinkGetState
): Response<DebugLinkLog>;
