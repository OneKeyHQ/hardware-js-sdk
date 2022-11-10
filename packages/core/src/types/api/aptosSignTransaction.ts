import { AptosSignedTx as HardwareAptosSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type AptosSignedTx = {
  path: string;
} & HardwareAptosSignedTx;

export type AptosSignTransactionParams = {
  path: string | number[];
  rawTx?: string;
};

export declare function aptosSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & AptosSignTransactionParams
): Response<AptosSignedTx>;
