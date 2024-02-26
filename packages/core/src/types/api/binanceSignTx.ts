import { BinanceSignedTx, BinanceSignTx as HardwareBinanceSignTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type BinanceSignTxParams = {
  path: string | number[];
} & Omit<HardwareBinanceSignTx, 'address_n'>;

export declare function binanceSignTx(
  connectId: string,
  deviceId: string,
  params: CommonParams & BinanceSignTxParams
): Response<BinanceSignedTx>;
