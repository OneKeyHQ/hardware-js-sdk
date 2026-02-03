import type { PROTO } from '../../constants';
import type { CardanoMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type CardanoSignMessageParams = {
  address_n: number[];
  message: string;
  derivation_type: number;
  network_id: number;
  address_type: number;
  protocol_magic?: number;
};

export type CardanoSignMessageMethodParams = {
  path: string;
  message: string;
  derivationType: number;
  networkId: number;
  addressType?: PROTO.CardanoAddressType;
  /**
   * Testnet	cip34:0-1097911063
   * Mainnet	cip34:1-764824073
   */
  protocolMagic?: number;
};

export declare function cardanoSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & CardanoSignMessageMethodParams
): Response<CardanoMessageSignature>;
