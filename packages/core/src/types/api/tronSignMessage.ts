import { TronMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TronSignMessageParams = {
  path: string | number[];
  messageHex: string;
  messageType?: 'V1' | 'V2';
};

export declare function tronSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & TronSignMessageParams
): Response<TronMessageSignature>;
