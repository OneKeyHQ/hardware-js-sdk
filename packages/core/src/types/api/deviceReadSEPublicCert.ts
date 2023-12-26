import { SEPublicCert } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceReadSEPublicCert(
  connectId: string,
  params: CommonParams
): Response<SEPublicCert>;
