import { FilecoinAddress as HardwareFilecoinAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type FilecoinAddress = {
  path: string;
} & HardwareFilecoinAddress;

export type FilecoinGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function filecoinGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & FilecoinGetAddressParams
): Response<FilecoinAddress>;

export declare function filecoinGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: FilecoinGetAddressParams[] }
): Response<Array<FilecoinAddress>>;
