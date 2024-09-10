import { DebugLinkLayout, DebugLinkFlashErase } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function debugLinkFlashErase(
  connectId: string,
  params: CommonParams & DebugLinkFlashErase
): Response<DebugLinkLayout>;
