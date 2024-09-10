import { Success, WriteSEPublicCert } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceWriteSEPublicCert(
  connectId: string,
  params: CommonParams & WriteSEPublicCert
): Response<Success>;
