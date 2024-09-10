import { ScdoSignedMessage } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type ScdoSignMessageParams = {
  path: string | number[];
  messageHex: string;
};

export declare function scdoSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & ScdoSignMessageParams
): Response<ScdoSignedMessage>;
