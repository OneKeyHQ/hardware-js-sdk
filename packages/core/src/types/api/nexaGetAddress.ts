import { NexaAddress as HardwarenexaAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type nexaAddress = {
  path: string;
} & HardwarenexaAddress;

export type nexaGetAddressParams = {
  path: string | number[];
  prefix?: string;
  scheme?: string;
  showOnOneKey?: boolean;
};

export declare function nexaGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & nexaGetAddressParams
): Response<nexaAddress>;

export declare function nexaGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: nexaGetAddressParams[] }
): Response<Array<nexaAddress>>;
