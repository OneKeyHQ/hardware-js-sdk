import type { BenfenAddress as HardwareBenfenAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type BenfenAddress = {
  path: string;
  pub?: string;
} & HardwareBenfenAddress;

export type BenfenGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function benfenGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & BenfenGetAddressParams
): Response<BenfenAddress>;

export declare function benfenGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: BenfenGetAddressParams[] }
): Response<Array<BenfenAddress>>;
