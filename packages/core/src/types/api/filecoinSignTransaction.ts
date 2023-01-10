import { FilecoinSignedTx as HardwareFilecoinSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type FilecoinSignedTx = {
  path: string;
} & HardwareFilecoinSignedTx;

export type FilecoinSignTransactionParams = {
  path: string | number[];
  rawTx?: string;
  isTestnet?: boolean;
};

export declare function filecoinSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & FilecoinSignTransactionParams
): Response<FilecoinSignedTx>;

export declare function filecoinSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: FilecoinSignTransactionParams[] }
): Response<Array<FilecoinSignedTx>>;
