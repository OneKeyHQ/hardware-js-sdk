import { SolanaSignedTx as HardwareSolanaSignedTx } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type SolanaSignedTx = {
  path: string;
} & HardwareSolanaSignedTx;

export type SolanaSignTransactionParams = {
  path: string | number[];
  rawTx?: string;
};

export declare function solSignTransaction(
  connectId: string,
  params: CommonParams & SolanaSignTransactionParams
): Response<SolanaSignedTx>;

export declare function solSignTransaction(
  connectId: string,
  params: CommonParams & { bundle?: SolanaSignTransactionParams[] }
): Response<Array<SolanaSignedTx>>;
