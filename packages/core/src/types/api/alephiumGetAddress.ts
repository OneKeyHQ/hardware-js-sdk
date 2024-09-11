import type { CommonParams, Response } from '../params';

export type AlephiumAddress = {
  path: string;
  publicKey?: string;
  address: string;
  derivedPath: string;
};

export type AlephiumGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
  includePublicKey?: boolean;
  group: number;
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
