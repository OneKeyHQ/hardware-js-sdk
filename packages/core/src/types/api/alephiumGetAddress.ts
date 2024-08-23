import { AlephiumAddress as HardwareAlephiumAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type AlephiumAddress = {
  path: string;
} & HardwareAlephiumAddress;

export type AlephiumGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function alephiumGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & AlephiumGetAddressParams
): Response<AlephiumAddress>;

export declare function alephiumGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: AlephiumGetAddressParams[] }
): Response<Array<AlephiumAddress>>;
