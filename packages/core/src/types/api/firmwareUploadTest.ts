import { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function firmwareUploadTest(
  connectId: string,
  params: CommonParams
): Response<Success>;
