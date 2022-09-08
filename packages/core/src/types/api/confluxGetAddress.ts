import { ConfluxAddress as HardwareConfluxAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type ConfluxAddress = {
  path: string;
} & HardwareConfluxAddress;

export type ConfluxGetAddressParams = {
  path: string | number[];
  chainId?: number;
  showOnOneKey?: boolean;
};

export declare function confluxGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & ConfluxGetAddressParams
): Response<ConfluxAddress>;

export declare function confluxGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: ConfluxGetAddressParams[] }
): Response<Array<ConfluxAddress>>;
