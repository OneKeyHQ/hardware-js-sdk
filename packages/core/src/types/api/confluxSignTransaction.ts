import type { CommonParams, Response } from '../params';

export type ConfluxSignedTx = {
  v: string;
  r: string;
  s: string;
};

export type ConfluxTransaction = {
  to: string;
  value: string;
  gasLimit: string;
  gasPrice: string;
  nonce: string;
  epochHeight: string;
  storageLimit: string;
  chainId?: number;
  data?: string;
  data_initial_chunk?: string;
  data_length?: string;
};

export type ConfluxSignTransactionParams = {
  path: string | number[];
  transaction: ConfluxTransaction;
};

export declare function confluxSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & ConfluxSignTransactionParams
): Response<ConfluxSignedTx>;
