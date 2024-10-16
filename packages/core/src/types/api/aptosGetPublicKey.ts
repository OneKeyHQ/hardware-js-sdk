import type { CommonParams, Response } from '../params';

export type AptosPublicKey = {
  path: string;
  pub: string;
  /**
   * @deprecated Use `pub` instead.
   */
  publicKey?: string;
};

export type AptosGetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function aptosGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & AptosGetPublicKeyParams
): Response<AptosPublicKey>;

export declare function aptosGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: AptosGetPublicKeyParams[] }
): Response<Array<AptosPublicKey>>;
