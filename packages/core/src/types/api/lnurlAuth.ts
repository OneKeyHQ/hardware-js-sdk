import type { CommonParams, Response } from '../params';

export interface LnurlAuth {
  pub?: string;
  /**
   * @deprecated Use `pub` instead.
   */
  publickey?: string;
  path?: string;
  signature?: string;
}

export interface LnurlAuthParams {
  domain: string;
  k1: string;
}

export declare function lnurlAuth(
  connectId: string,
  deviceId: string,
  params: CommonParams & LnurlAuthParams
): Response<LnurlAuth>;
