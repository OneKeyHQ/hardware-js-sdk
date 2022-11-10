import type { CommonParams, Response } from '../params';

export type EVMSignedTx = {
  v: string;
  r: string;
  s: string;
};

export type EVMTransaction = {
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  maxFeePerGas?: typeof undefined;
  maxPriorityFeePerGas?: typeof undefined;
  nonce: string;
  data?: string;
  chainId: number;
  txType?: number;
};

export type EVMAccessList = {
  address: string;
  storageKeys: string[];
};

export type EVMTransactionEIP1559 = {
  to: string;
  value: string;
  gasLimit: string;
  gasPrice?: typeof undefined;
  nonce: string;
  data?: string;
  chainId: number;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  accessList?: EVMAccessList[];
};

export type EVMSignTransactionParams = {
  path: string | number[];
  transaction: EVMTransaction | EVMTransactionEIP1559;
};

export declare function evmSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & EVMSignTransactionParams
): Response<EVMSignedTx>;
