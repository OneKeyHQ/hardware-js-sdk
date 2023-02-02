import { PolkadotAddress as HardwarePolkadotAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type PolkadotAddress = {
  path: string;
  publicKey: string;
} & HardwarePolkadotAddress;

export type PolkadotGetAddressParams = {
  path: string | number[];
  prefix: number;
  network: string;
  showOnOneKey?: boolean;
};

export declare function polkadotGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & PolkadotGetAddressParams
): Response<PolkadotAddress>;

export declare function polkadotGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: PolkadotGetAddressParams[] }
): Response<Array<PolkadotAddress>>;
