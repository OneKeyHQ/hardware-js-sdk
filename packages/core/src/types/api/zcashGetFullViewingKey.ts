import type { CommonParams, Response } from '../params';

export type ZcashFullViewingKey = {
  path: string;
  // ZIP-316 unified full viewing key with transparent and Orchard components
  ufvk: string;
};

export type ZcashGetFullViewingKeyParams = {
  // ZIP-32 account path, m/32'/133'/account'
  path: string | number[];
};

export declare function zcashGetFullViewingKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & ZcashGetFullViewingKeyParams
): Response<ZcashFullViewingKey>;

export declare function zcashGetFullViewingKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: ZcashGetFullViewingKeyParams[] }
): Response<Array<ZcashFullViewingKey>>;
