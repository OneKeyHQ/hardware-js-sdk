import type { DebugLinkWatchLayout, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function debugLinkWatchLayout(
  connectId: string,
  params: CommonParams & DebugLinkWatchLayout
): Response<Success>;
