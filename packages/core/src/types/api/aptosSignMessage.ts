import { AptosMessageSignature as HardwareAptosMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type AptosMessageSignature = {
  path: string;
  fullMessage: string;
} & HardwareAptosMessageSignature;

declare type AptosMessagePayload = {
  address?: string;
  chainId?: string;
  application?: string;
  nonce: string;
  message: string;
};

export type AptosSignMessageParams = {
  path: string | number[];
  payload: AptosMessagePayload;
};

export declare function aptosSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & AptosSignMessageParams
): Response<AptosMessageSignature>;
