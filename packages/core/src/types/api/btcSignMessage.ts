import { MessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type BTCSignMessageParams = {
  path: string | number[];
  messageHex: string;
  coin?: string;
  noScriptType?: boolean;
};

export declare function btcSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & BTCSignMessageParams,
): Response<MessageSignature>;
