import type { StarknetPublicKeyType } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type StarknetAddress = {
  path: string;
  // 0x-prefixed account address computed by the device; says nothing about deployment
  address: string;
};

export type StarknetGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
  // defaults to STARK
  publicKeyType?: StarknetPublicKeyType;
  // Felts are hex strings, 0x optional. The device only accepts its built-in
  // account classes and checks that the constructor owner is its own key.
  classHash: string;
  contractAddressSalt: string;
  constructorCalldata: string[];
};

export declare function starknetGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & StarknetGetAddressParams
): Response<StarknetAddress>;

export declare function starknetGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: StarknetGetAddressParams[] }
): Response<Array<StarknetAddress>>;
