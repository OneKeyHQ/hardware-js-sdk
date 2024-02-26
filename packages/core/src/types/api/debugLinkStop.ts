import { DebugLinkState, DebugLinkGetState } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function debugLinkStop(
  connectId: string,
  params: CommonParams & DebugLinkGetState
): Response<DebugLinkState>;
