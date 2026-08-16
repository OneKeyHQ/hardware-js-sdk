import type { BinancePublicKey as HardwareBinancePublicKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export type TezosPublicKey = {
  path: string;
} & HardwareBinancePublicKey;

export type BinanceGetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function binanceGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & BinanceGetPublicKeyParams
): Response<TezosPublicKey>;
