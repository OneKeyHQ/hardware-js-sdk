import { SEPublicKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function readSEPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams
): Response<SEPublicKey>;
