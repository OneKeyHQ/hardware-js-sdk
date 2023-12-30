import { BinanceAddress as HardwareBinanceAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TezosAddress = {
  path: string;
} & HardwareBinanceAddress;

export type BinanceAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function binanceGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & BinanceAddressParams
): Response<TezosAddress>;
