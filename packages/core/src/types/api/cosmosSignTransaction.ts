import { CosmosSignedTx as HardwareCosmosSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type CosmosSignedTx = {
  path: string;
} & HardwareCosmosSignedTx;

export type CosmosSignTransactionParams = {
  path: string | number[];
  rawTx?: string;
};

export declare function cosmosSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & CosmosSignTransactionParams
): Response<CosmosSignedTx>;
