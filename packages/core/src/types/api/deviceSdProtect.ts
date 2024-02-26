import { SdProtect, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceSdProtect(
  connectId: string,
  params: CommonParams & SdProtect
): Response<Success>;
