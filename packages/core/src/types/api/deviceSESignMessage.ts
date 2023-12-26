import { SESignMessage, SEMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceSESignMessage(
  connectId: string,
  params: CommonParams & SESignMessage
): Response<SEMessageSignature>;
