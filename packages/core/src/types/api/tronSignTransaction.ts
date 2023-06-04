import { UintType, TronSignedTx, TronResourceCode } from '@onekeyfe/hd-transport';
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

export type TronFreezeBalanceV2Contract = {
  frozenBalance?: number;
  resource?: TronResourceCode;
};

export type TronUnfreezeBalanceV2Contract = {
  resource?: TronResourceCode;
  unfreezeBalance?: number;
};

export type TronDelegateResourceContract = {
  resource?: TronResourceCode;
  balance?: number;
  receiverAddress?: string;
  lock?: boolean;
};

export type TronUnDelegateResourceContract = {
  resource?: TronResourceCode;
  balance?: number;
  receiverAddress?: string;
};

export type TronWithdrawBalanceContract = {
  ownerAddress?: string;
};

export type TronWithdrawExpireUnfreezeContract = undefined;

export type TronTransactionContract = {
  transferContract?: TronTransferContract;
  triggerSmartContract?: TronTriggerSmartContract;
  freezeBalanceV2Contract?: TronFreezeBalanceV2Contract;
  unfreezeBalanceV2Contract?: TronUnfreezeBalanceV2Contract;
  delegateResourceContract?: TronDelegateResourceContract;
  unDelegateResourceContract?: TronUnDelegateResourceContract;
  withdrawBalanceContract?: TronWithdrawBalanceContract;
  withdrawExpireUnfreezeContract?: TronWithdrawExpireUnfreezeContract;
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
  params: CommonParams & TronSignTransactionParams
): Response<TronSignedTx>;
