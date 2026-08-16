import type { DebugLinkEraseSdCard, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function debugLinkEraseSdCard(
  connectId: string,
  params: CommonParams & DebugLinkEraseSdCard
): Response<Success>;
