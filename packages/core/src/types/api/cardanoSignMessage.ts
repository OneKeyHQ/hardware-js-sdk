import type { CardanoMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type CardanoSignMessageParams = {
  address_n: number[];
  message: string;
  derivation_type: number;
  network_id: number;
};

export type CardanoSignMessageMethodParams = {
  path: string;
  message: string;
  derivationType: number;
  networkId: number;
};

export declare function cardanoSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & CardanoSignMessageMethodParams
): Response<CardanoMessageSignature>;
