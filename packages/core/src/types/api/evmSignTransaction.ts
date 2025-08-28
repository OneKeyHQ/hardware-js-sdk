import type { CommonParams, Response } from '../params';

export type EVMSignedTx = {
  v: string;
  r: string;
  s: string;
  authorizationSignatures?: EVMAuthorizationSignature[];
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

export type EVMAuthorizationSignature = {
  yParity: number;
  r: string;
  s: string;
};

export type EVMAuthorization = {
  chainId: number;
  address: string;
  nonce: string;
  addressN?: number[];
  yParity?: number;
  r?: string;
  s?: string;
};

export type EVMTransactionEIP7702 = {
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
  authorizationList: EVMAuthorization[];
};

export type EVMSignTransactionParams = {
  path: string | number[];
  transaction: EVMTransaction | EVMTransactionEIP1559 | EVMTransactionEIP7702;
};

export declare function evmSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & EVMSignTransactionParams
): Response<EVMSignedTx>;
