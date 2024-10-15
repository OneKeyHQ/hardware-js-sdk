import type { CommonParams, Response } from '../params';

export type CosmosPublicKey = {
  path: string;
  pub: string;
  publicKey?: string;
};

export type CosmosGetPublicKeyParams = {
  path: string | number[];
  curve?: string;
  showOnOneKey?: boolean;
};

export declare function cosmosGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & CosmosGetPublicKeyParams
): Response<CosmosPublicKey>;

export declare function cosmosGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: CosmosGetPublicKeyParams[] }
): Response<Array<CosmosPublicKey>>;
