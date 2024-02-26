import { MoneroAddress as HardwareMoneroAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type MoneroAddress = {
  path: string;
} & HardwareMoneroAddress;

export type MoneroGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function moneroGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & MoneroGetAddressParams
): Response<MoneroAddress>;

export declare function moneroGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: MoneroGetAddressParams[] }
): Response<Array<MoneroAddress>>;
