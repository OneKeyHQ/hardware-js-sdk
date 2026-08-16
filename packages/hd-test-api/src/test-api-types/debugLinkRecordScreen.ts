import type { DebugLinkRecordScreen, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function debugLinkRecordScreen(
  connectId: string,
  params: CommonParams & DebugLinkRecordScreen
): Response<Success>;
