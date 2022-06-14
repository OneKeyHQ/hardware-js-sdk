import type { CommonParams, Response } from '../params';

export type EVMAddress = {
  path: string;
  address: string;
};

export type EVMGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function evmGetAddress(
  connectId: string,
  params: CommonParams & EVMGetAddressParams
): Response<EVMAddress>;

export declare function evmGetAddress(
  connectId: string,
  params: CommonParams & { bundle?: EVMGetAddressParams[] }
): Response<Array<EVMAddress>>;
