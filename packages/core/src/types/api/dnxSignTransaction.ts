import { UintType } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DnxTxKey = {
  ephemeralTxSecKey: string;
  ephemeralTxPubKey: string;
};

export type DnxSignTransactionParams = {
  path: string | number[];
  inputs: {
    prevIndex: number;
    globalIndex: number;
    txPubkey: string;
    prevOutPubkey: string;
    amount: UintType;
  };
  toAddress: string;
  amount: UintType;
  fee: UintType;
  paymentIdHex?: string;
};

export type DnxSignature = {
  path: string;
  txKey: DnxTxKey;
  computedKeyImages: string[];
  signatures: string[];
  outputKeys: string[];
};

export declare function dnxSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & DnxSignTransactionParams
): Response<DnxSignature>;
