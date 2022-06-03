import { Success } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type BTCVerifyMessageParams = {
  coin: string;
  inputs: [];
  outputs: [];
  locktime?: number;
  version?: number;
  expiry?: number;
  versionGroupId?: number;
  overwintered?: boolean;
  timestamp?: number;
  branchId?: number;
};

export declare function btcSignTransaction(
  params: CommonParams & BTCVerifyMessageParams
): Response<Success>;
