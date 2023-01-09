import { NearSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type NearSignTransactionParams = {
  path: string | number[];
  rawTx: string;
};

export declare function nearSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & NearSignTransactionParams
): Response<NearSignedTx>;
