import { TronMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TronSignMessageParams = {
  path: string | number[];
  messageHex: string;
};

export declare function tronSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & TronSignMessageParams
): Response<TronMessageSignature>;
