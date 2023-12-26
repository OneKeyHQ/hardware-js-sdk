import { Success, ChangeWipeCode } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceChangeWipeCode(
  connectId: string,
  params: CommonParams & ChangeWipeCode
): Response<Success>;
