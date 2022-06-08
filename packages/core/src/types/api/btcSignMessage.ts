import { MessageSignature } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type BTCSignMessageParams = {
  path: string | number[];
  messageHex: string;
  coin?: string;
};

export declare function btcSignMessage(
  params: CommonParams & BTCSignMessageParams
): Response<MessageSignature>;
