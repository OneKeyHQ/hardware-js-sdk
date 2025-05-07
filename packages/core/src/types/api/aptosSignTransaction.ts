import { AptosSignedTx as HardwareAptosSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';
import { PROTO } from '../../constants';

export type AptosSignedTx = {
  path: string;
} & HardwareAptosSignedTx;

export type AptosSignTransactionParams = {
  path: string;
  rawTx?: string;
  transactionType?: PROTO.AptosTransactionType;
};

export declare function aptosSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & AptosSignTransactionParams
): Response<AptosSignedTx>;
