import type { BenfenMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type BenfenSignMessageParams = {
  path: string | number[];
  messageHex: string;
};

export declare function benfenSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & BenfenSignMessageParams
): Response<BenfenMessageSignature>;
