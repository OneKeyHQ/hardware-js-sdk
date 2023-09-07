import { SuiMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type SuiSignMessageParams = {
  path: string | number[];
  messageHex: string;
};

export declare function suiSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & SuiSignMessageParams
): Response<SuiMessageSignature>;
