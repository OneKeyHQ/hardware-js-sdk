import { StarcoinAddress as HardwareStarcoinAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type StarcoinAddress = {
  path: string;
} & HardwareStarcoinAddress;

export type StarcoinGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function starcoinGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & StarcoinGetAddressParams
): Response<StarcoinAddress>;

export declare function starcoinGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: StarcoinGetAddressParams[] }
): Response<Array<StarcoinAddress>>;
