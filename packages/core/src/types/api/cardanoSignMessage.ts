import type { CardanoMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';
import { PROTO } from '../../constants';

export type CardanoSignMessageParams = {
  address_n: number[];
  message: string;
  derivation_type: number;
  network_id: number;
  address_type: number;
};

export type CardanoSignMessageMethodParams = {
  path: string;
  message: string;
  derivationType: number;
  networkId: number;
  addressType?: PROTO.CardanoAddressType;
};

export declare function cardanoSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & CardanoSignMessageMethodParams
): Response<CardanoMessageSignature>;
