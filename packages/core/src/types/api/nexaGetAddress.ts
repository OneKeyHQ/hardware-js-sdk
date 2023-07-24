import type { CommonParams, Response } from '../params';

export type NexaAddress = {
  path: string;
  pub: string;
  address: string;
};

export type NexaGetAddressParams = {
  path: string | number[];
  prefix?: string;
  scheme?: string;
  showOnOneKey?: boolean;
};

export declare function nexaGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & NexaGetAddressParams
): Response<NexaAddress>;

export declare function nexaGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: NexaGetAddressParams[] }
): Response<Array<NexaAddress>>;
