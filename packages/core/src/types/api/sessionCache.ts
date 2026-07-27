import type { Response } from '../params';

export type ClearSessionCacheParams = {
  deviceId?: string;
  passphraseState?: string;
};

export type ClearSessionCachePayload = {
  cleared: true;
};

export declare function clearSessionCache(
  params?: ClearSessionCacheParams
): Response<ClearSessionCachePayload>;
