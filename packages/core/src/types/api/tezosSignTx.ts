import { TezosSignedTx, TezosSignTx as HardwareTezosSignTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TezosSignTxParams = {
  path: string | number[];
} & Omit<HardwareTezosSignTx, 'address_n'>;

export declare function tezosSignTx(
  connectId: string,
  deviceId: string,
  params: CommonParams & TezosSignTxParams
): Response<TezosSignedTx>;
