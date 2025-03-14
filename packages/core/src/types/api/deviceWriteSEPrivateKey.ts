import { Success, WriteSEPrivateKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceWriteSEPrivateKey(
  connectId: string,
  params: CommonParams & WriteSEPrivateKey
): Response<Success>;
