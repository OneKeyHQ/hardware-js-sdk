import type { CardanoAddressParametersType } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';
import type { CardanoAddressParameters } from './cardano';

export type CardanoGetAddressMethodParams = {
  addressParameters: CardanoAddressParameters;
  networkId: number;
  /**
   * Testnet	cip34:0-1097911063
   * Mainnet	cip34:1-764824073
   */
  protocolMagic: number;
  derivationType: number;
  address: string;
  showOnOneKey: boolean;
};

export type CardanoGetAddressParams = {
  address_parameters: CardanoAddressParametersType;
  network_id: number;
  protocol_magic: number;
  derivation_type: number;
  address: string;
  show_display: boolean;
};

export type CardanoAddress = {
  addressParameters: CardanoAddressParameters;
  protocolMagic: number;
  networkId: number;
  serializedPath: string;
  serializedStakingPath: string;
  address: string;
  xpub: string;
};

export declare function cardanoGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & CardanoGetAddressMethodParams
): Response<CardanoAddress>;

export declare function cardanoGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: CardanoGetAddressMethodParams[] }
): Response<CardanoAddress[]>;
