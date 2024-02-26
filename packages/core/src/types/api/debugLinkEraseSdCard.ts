import { Success, DebugLinkEraseSdCard } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function debugLinkEraseSdCard(
  connectId: string,
  params: CommonParams & DebugLinkEraseSdCard
): Response<Success>;
