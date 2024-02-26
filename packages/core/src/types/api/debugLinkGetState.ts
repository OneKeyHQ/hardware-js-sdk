import { DebugLinkLog, DebugLinkGetState } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function debugLinkGetState(
  connectId: string,
  params: CommonParams & DebugLinkGetState
): Response<DebugLinkLog>;
