import { AptosSignedTx as HardwareAptosSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type BenfenSignedTx = {
  path: string;
  coinType?: string;
} & HardwareAptosSignedTx;

export type BenfenSignTransactionParams = {
  path: string | number[];
  rawTx?: string;
};

export declare function benfenSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & BenfenSignTransactionParams
): Response<BenfenSignedTx>;
