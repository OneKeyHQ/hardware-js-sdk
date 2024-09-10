import { Success, DebugLinkWatchLayout } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function debugLinkWatchLayout(
  connectId: string,
  params: CommonParams & DebugLinkWatchLayout
): Response<Success>;
