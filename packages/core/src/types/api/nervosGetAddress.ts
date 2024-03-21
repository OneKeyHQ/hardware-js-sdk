import type { NervosAddress as HardwareNervosAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type NervosAddress = {
  path: string;
} & HardwareNervosAddress;

export type NervosGetAddressParams = {
  path: string | number[];
  network: string;
  showOnOneKey?: boolean;
};

export declare function nervosGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & NervosGetAddressParams
): Response<NervosAddress>;

export declare function nervosGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: NervosGetAddressParams[] }
): Response<Array<NervosAddress>>;
