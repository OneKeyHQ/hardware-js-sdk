import { StarcoinSignedTx } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type StarcoinSignTransactionParams = {
  path: string | number[];
  rawTx: string;
};

export declare function starcoinSignTransaction(
  connectId: string,
  params: CommonParams & StarcoinSignTransactionParams
): Response<StarcoinSignedTx>;
