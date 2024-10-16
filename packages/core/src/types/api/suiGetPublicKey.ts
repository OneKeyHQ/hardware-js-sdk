import type { CommonParams, Response } from '../params';

export type SuiPublicKey = {
  path: string;
  pub: string;
  /**
   * @deprecated Use `pub` instead.
   */
  publicKey?: string;
};

export type SuiGetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function suiGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & SuiGetPublicKeyParams
): Response<SuiPublicKey>;

export declare function suiGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: SuiGetPublicKeyParams[] }
): Response<Array<SuiPublicKey>>;
