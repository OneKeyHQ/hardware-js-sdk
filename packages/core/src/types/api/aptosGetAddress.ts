import { AptosAddress as HardwareAptosAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type AptosAddress = {
  path: string;
} & HardwareAptosAddress;

export type AptosGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function aptosGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & AptosGetAddressParams
): Response<AptosAddress>;

export declare function aptosGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: AptosGetAddressParams[] }
): Response<Array<AptosAddress>>;
