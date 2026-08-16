import type { DebugLinkDecision, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function debugLinkDecision(
  connectId: string,
  params: CommonParams & DebugLinkDecision
): Response<Success>;
