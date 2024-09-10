import type { GetECDHSessionKey, ECDHSessionKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function cryptoGetECDHSessionKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & GetECDHSessionKey
): Response<ECDHSessionKey>;
