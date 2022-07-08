import { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type BTCVerifyMessageParams = {
  address: string;
  messageHex: string;
  signature: string;
  coin: string;
};

export declare function btcVerifyMessage(
  connectId: string,
  params: CommonParams & BTCVerifyMessageParams
): Response<Success>;
