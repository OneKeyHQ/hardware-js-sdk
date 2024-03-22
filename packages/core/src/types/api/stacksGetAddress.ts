import type { CommonParams, Response } from '../params';

export type StacksAddress = {
  path: string;
  pub: string;
  address: string;
};

export type StacksGetAddressParams = {
  path: string | number[];
  prefix?: string;
  scheme?: string;
  showOnOneKey?: boolean;
};

export declare function stacksGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & StacksGetAddressParams
): Response<StacksAddress>;

export declare function stacksGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: StacksGetAddressParams[] }
): Response<Array<StacksAddress>>;
