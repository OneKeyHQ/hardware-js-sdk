import type { SignIdentity, ECDHSessionKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function cryptoSignIdentity(
  connectId: string,
  deviceId: string,
  params: CommonParams & SignIdentity
): Response<ECDHSessionKey>;
