import type { DebugLinkRecordScreen, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function debugLinkRecordScreen(
  connectId: string,
  params: CommonParams & DebugLinkRecordScreen
): Response<Success>;
