import type { CommonParams, Response } from '../params';

export type PolkadotPublicKey = {
  path: string;
  publicKey: string;
};

export type PolkadotGetPublicKeyParams = {
  path: string | number[];
  curve?: string;
  showOnOneKey?: boolean;
};

export declare function polkadotGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & PolkadotGetPublicKeyParams
): Response<PolkadotPublicKey>;

export declare function polkadotGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: PolkadotGetPublicKeyParams[] }
): Response<Array<PolkadotPublicKey>>;
