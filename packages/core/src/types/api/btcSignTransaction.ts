import {
  TxInput as OrigTxInput,
  PrevInput,
  Success,
  TxOutputBinType,
  TxOutputType,
  TxInputType,
} from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type RefTransaction =
  | {
      hash: string;
      version: number;
      inputs: PrevInput[];
      bin_outputs: TxOutputBinType[];
      outputs?: typeof undefined;
      lock_time: number;
      extra_data?: string;
      expiry?: number;
      overwintered?: boolean;
      version_group_id?: number;
      timestamp?: number;
      branch_id?: number;
    }
  | {
      hash: string;
      version: number;
      inputs: OrigTxInput[];
      bin_outputs?: typeof undefined;
      outputs: TxOutputType[];
      lock_time: number;
      extra_data?: string;
      expiry?: number;
      overwintered?: boolean;
      version_group_id?: number;
      timestamp?: number;
      branch_id?: number;
    };

export type BTCVerifyMessageParams = {
  coin: string;
  inputs: TxInputType[];
  outputs: TxOutputType[];
  refTxs: RefTransaction[];
  locktime?: number;
  version?: number;
  // Only available for Decred and Zcash
  expiry?: number;
  // Only available for Zcash
  overwintered?: boolean;
  // Only available for Zcash, set overwintered to nVersionGroupId
  versionGroupId?: number;
  // Only available for Zcash when overwintered is true
  branchId?: number;
  // Only available for Capricoin
  timestamp?: number;
};

export declare function btcSignTransaction(
  params: CommonParams & BTCVerifyMessageParams
): Response<Success>;
