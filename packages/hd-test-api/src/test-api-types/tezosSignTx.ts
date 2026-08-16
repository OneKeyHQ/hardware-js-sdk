import type { TezosSignTx as HardwareTezosSignTx, TezosSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export type TezosSignTxParams = {
  path: string | number[];
} & Omit<HardwareTezosSignTx, 'address_n'>;

export declare function tezosSignTx(
  connectId: string,
  deviceId: string,
  params: CommonParams & TezosSignTxParams
): Response<TezosSignedTx>;
