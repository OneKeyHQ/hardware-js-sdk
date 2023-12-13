import { Success, DebugLinkDecision } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function debugLinkDecision(
  connectId: string,
  params: CommonParams & DebugLinkDecision
): Response<Success>;
