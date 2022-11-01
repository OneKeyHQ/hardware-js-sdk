import { CosmosAddress as HardwareCosmosAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type CosmosAddress = {
  path: string;
} & HardwareCosmosAddress;

export type CosmosGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function cosmosGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & CosmosGetAddressParams
): Response<CosmosAddress>;

export declare function cosmosGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: CosmosGetAddressParams[] }
): Response<Array<CosmosAddress>>;
