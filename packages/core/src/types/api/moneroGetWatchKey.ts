import type { CommonParams, Response } from '../params';

export type MoneroWatchKey = {
  path: string;
  // Private view key, hex
  watchKey: string;
  // Primary address of the account, base58
  address: string;
};

export type MoneroGetWatchKeyParams = {
  // Account path, m/44'/128'/account'
  path: string | number[];
  // 0 mainnet, 1 testnet, 2 stagenet
  networkType?: number;
};

export declare function moneroGetWatchKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & MoneroGetWatchKeyParams
): Response<MoneroWatchKey>;

export declare function moneroGetWatchKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: MoneroGetWatchKeyParams[] }
): Response<Array<MoneroWatchKey>>;
