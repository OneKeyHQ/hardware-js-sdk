import { StellarAddress as HardwareStellarAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type StellarAddress = {
  path: string;
} & HardwareStellarAddress;

export type StellarGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function stellarGetAddress(
  connectId: string,
  params: CommonParams & StellarGetAddressParams
): Response<StellarAddress>;

export declare function stellarGetAddress(
  connectId: string,
  params: CommonParams & { bundle?: StellarGetAddressParams[] }
): Response<Array<StellarAddress>>;
