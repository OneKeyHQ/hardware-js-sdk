import { Success } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type BTCVerifyMessageParams = {
  address: string;
  messageHex: string;
  signature: string;
  coin: string;
};

export declare function btcVerifyMessage(
  params: CommonParams & BTCVerifyMessageParams
): Response<Success>;
