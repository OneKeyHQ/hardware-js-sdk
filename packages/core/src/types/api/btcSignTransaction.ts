import {
  TxInput as OrigTxInput,
  PrevInput,
  TxOutputBinType,
  TxOutputType,
  TxInputType,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type SignedTransaction = {
  signatures: string[];
  serializedTx: string;
  txid?: string;
};

export type TransactionOptions = {
  version?: number;
  lock_time?: number;
  expiry?: number;
  overwintered?: boolean;
  version_group_id?: number;
  timestamp?: number;
  branch_id?: number;
};

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

export type AccountAddress = {
  address: string;
  path: string;
  transfers?: number;
  balance?: string;
  sent?: string;
  received?: string;
};

export type AccountAddresses = {
  change: AccountAddress[];
  used: AccountAddress[];
  unused: AccountAddress[];
};

export type BTCSignTransactionParams = {
  coin: string;
  inputs: TxInputType[];
  outputs: TxOutputType[];
  refTxs: RefTransaction[];
  account?: {
    // Partial account (addresses)
    addresses: AccountAddresses;
  };
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
  connectId: string,
  deviceId: string,
  params: CommonParams & BTCSignTransactionParams
): Response<SignedTransaction>;
