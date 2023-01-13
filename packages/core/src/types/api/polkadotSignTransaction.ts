import { PolkadotSignedTx as HardwarePolkadotSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type PolkadotSignedTx = {
  path: string;
} & HardwarePolkadotSignedTx;

export type PolkadotSignTransactionParams = {
  path: string | number[];
  rawTx?: string;
};

export declare function polkadotSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & PolkadotSignTransactionParams
): Response<PolkadotSignedTx>;
