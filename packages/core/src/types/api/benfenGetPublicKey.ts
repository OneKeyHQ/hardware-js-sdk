import type { CommonParams, Response } from '../params';

export type BenfenPublicKey = {
  path: string;
  pub: string;
  /**
   * @deprecated Use `pub` instead.
   */
  publicKey?: string;
};

export type BenfenGetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function benfenGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & BenfenGetPublicKeyParams
): Response<BenfenPublicKey>;

export declare function benfenGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: BenfenGetPublicKeyParams[] }
): Response<Array<BenfenPublicKey>>;
