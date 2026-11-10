import type { CommonParams, Response } from '../params';

export type MoneroAddress = {
  path: string;
  // Primary address of the account, base58
  address: string;
};

export type MoneroGetAddressParams = {
  // Account path, m/44'/128'/account'
  path: string | number[];
  showOnOneKey?: boolean;
  // 0 mainnet, 1 testnet, 2 stagenet
  networkType?: number;
};

export declare function moneroGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & MoneroGetAddressParams
): Response<MoneroAddress>;

export declare function moneroGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: MoneroGetAddressParams[] }
): Response<Array<MoneroAddress>>;
