import { ScdoSignedTx as HardwareScdoSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type ScdoSignedTx = {
  path: string;
} & HardwareScdoSignedTx;

export type ScdoSignTransactionParams = {
  path: string | number[];
  nonce: string;
  gasPrice: string;
  gasLimit: string;
  to: string;
  value: string;
  timestamp?: string;
  data?: string;
  txType?: number;
};

export declare function scdoSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & ScdoSignTransactionParams
): Response<ScdoSignedTx>;
