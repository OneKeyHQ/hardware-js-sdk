import type { CommonParams, Response } from '../params';

export type NeoAddress = {
  path: string;
  address: string;
  pub: string;
};

export type NeoGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function neoGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & NeoGetAddressParams
): Response<NeoAddress>;

export declare function neoGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: NeoGetAddressParams[] }
): Response<Array<NeoAddress>>;
