import type { ECDHSessionKey, SignIdentity } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function cryptoSignIdentity(
  connectId: string,
  deviceId: string,
  params: CommonParams & SignIdentity
): Response<ECDHSessionKey>;
