import { StarcoinSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type StarcoinSignTransactionParams = {
  path: string | number[];
  rawTx: string;
};

export declare function starcoinSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & StarcoinSignTransactionParams
): Response<StarcoinSignedTx>;
