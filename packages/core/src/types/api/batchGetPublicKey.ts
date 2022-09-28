import type { CommonParams, Response } from '../params';

export type BatchGetPublicKeyParams = {
  paths: string[];
  /**
   * secp256k1 for eth and btc
   * ed25519 for sol, stc, aptos
   */
  ecdsaCurveName: 'secp256k1' | 'ed25519';
};

export type BatchGetPublicKeyResponse = { path: string; publicKey: string }[];

export declare function batchGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & BatchGetPublicKeyParams
): Response<BatchGetPublicKeyResponse>;
