import type { DnxAddress as HardwareDnxAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DnxAddress = {
  path: string;
} & HardwareDnxAddress;

export type DnxGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function dnxGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & DnxGetAddressParams
): Response<DnxAddress>;

export declare function dnxGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: DnxGetAddressParams[] }
): Response<Array<DnxAddress>>;
