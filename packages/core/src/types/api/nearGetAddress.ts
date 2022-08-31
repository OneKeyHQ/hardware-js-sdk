import { NearAddress as HardwareNearAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type NearAddress = {
  path: string;
} & HardwareNearAddress;

export type NearGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function nearGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & NearGetAddressParams,
): Response<NearAddress>;

export declare function nearGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: NearGetAddressParams[] },
): Response<Array<NearAddress>>;
