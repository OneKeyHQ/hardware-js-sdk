import { AlgorandSignedTx as HardwareAlgorandSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type AlgoSignedTx = {
  path: string;
} & HardwareAlgorandSignedTx;

export type AlgoSignTransactionParams = {
  path: string | number[];
  rawTx?: string;
};

export declare function algoSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & AlgoSignTransactionParams
): Response<AlgoSignedTx>;
