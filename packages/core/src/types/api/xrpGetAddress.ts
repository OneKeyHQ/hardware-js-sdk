import type { CommonParams, Response } from '../params';

export type XrpAddress = {
  path: string;
  publicKey?: string;
  address: string;
};

export type XrpGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function xrpGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & XrpGetAddressParams
): Response<XrpAddress>;

export declare function xrpGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: XrpGetAddressParams[] }
): Response<XrpAddress[]>;
