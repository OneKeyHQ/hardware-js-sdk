import { EthereumMessageSignature } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export interface EVMTransaction {
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
}

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
  params: CommonParams & EVMSignTransactionParams
): Response<EthereumMessageSignature>;
