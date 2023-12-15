import type { CommonParams, Response } from '../params';

export type NostrSignedSchnorr = {
  signature: string;
};

export interface NostrSignSchnorrParams {
  path: string | number[];
  hash: string;
}

export type NostrSignedSchnorrResponse = {
  path: string;
  rawHash: string;
  signature: string;
};

export declare function nostrSignSchnorr(
  connectId: string,
  deviceId: string,
  params: CommonParams & NostrSignSchnorrParams
): Response<NostrSignedSchnorrResponse>;
