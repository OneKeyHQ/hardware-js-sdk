import { Success, DebugLinkReseedRandom } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function debugLinkReseedRandom(
  connectId: string,
  params: CommonParams & DebugLinkReseedRandom
): Response<Success>;
