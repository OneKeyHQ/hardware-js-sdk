import { TezosAddress as HardwareTezosAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TezosAddress = {
  path: string;
} & HardwareTezosAddress;

export type TezosGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function tezosGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & TezosGetAddressParams
): Response<TezosAddress>;

export declare function tezosGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: TezosGetAddressParams[] }
): Response<Array<TezosAddress>>;
