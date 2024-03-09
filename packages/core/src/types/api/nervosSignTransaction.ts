import type { NervosSignedTx as HardwareNervosSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type NervosSignedTx = {
  path: string;
} & HardwareNervosSignedTx;

export type NervosSignTransactionParams = {
  path: string | number[];
  network: string;
  rawTx: string;
  witnessHex: string;
};

export declare function nervosSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & NervosSignTransactionParams
): Response<NervosSignedTx>;
