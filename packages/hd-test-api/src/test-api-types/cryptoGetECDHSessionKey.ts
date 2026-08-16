import type { ECDHSessionKey, GetECDHSessionKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function cryptoGetECDHSessionKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & GetECDHSessionKey
): Response<ECDHSessionKey>;
