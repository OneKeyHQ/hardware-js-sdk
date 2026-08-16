import type { DebugLinkFlashErase, DebugLinkLayout } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function debugLinkFlashErase(
  connectId: string,
  params: CommonParams & DebugLinkFlashErase
): Response<DebugLinkLayout>;
