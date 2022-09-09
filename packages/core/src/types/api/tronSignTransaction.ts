import { UintType, TronSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TronTransferContract = {
  toAddress?: string;
  amount?: UintType;
};

export type TronTriggerSmartContract = {
  contractAddress?: string;
  callValue?: number;
  data?: string;
  callTokenValue?: number;
  assetId?: number;
};

export type TronTransactionContract = {
  transferContract?: TronTransferContract;
  triggerSmartContract?: TronTriggerSmartContract;
};

export type TronTransaction = {
  refBlockBytes: string;
  refBlockHash: string;
  expiration: number;
  data?: string;
  contract: TronTransactionContract;
  timestamp: number;
  feeLimit?: number;
};

export type TronSignTransactionParams = {
  path: string | number[];
  transaction: TronTransaction;
};

export declare function tronSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & TronSignTransactionParams,
): Response<TronSignedTx>;
