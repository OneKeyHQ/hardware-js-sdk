import type { CommonParams, Response } from '../params';

export type NeoUnsignedTx = {
  path: string;
  rawTx: string;
  magicNumber?: number;
};

export type NeoSignedTx = {
  publicKey: string;
  signature: string;
};

export declare function neoSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & NeoUnsignedTx
): Response<NeoSignedTx>;
