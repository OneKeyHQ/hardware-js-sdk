import type { MoneroTransactionData, MoneroTransactionSourceEntry } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type MoneroSignTransactionParams = {
  // Account path, m/44'/128'/account'
  path: string | number[];
  // 0 mainnet, 1 testnet, 2 stagenet
  networkType?: number;
  // Init data in protobuf field names; outputs include the change, in final order
  tsxData: MoneroTransactionData;
  // One source entry per input, in original order, each with its full ring
  inputs: MoneroTransactionSourceEntry[];
};

// Raw device output, hex unless noted. The host assembles the transaction.
export type MoneroSignTransactionResult = {
  // Original input index of each sorted input
  origIndices: number[];
  // Serialized tx.vin entries, sorted by key image (descending)
  vinis: string[];
  // Pseudo-output commitments from SignInputAck, sorted order
  pseudoOuts: string[];
  // Sealed CLSAG signatures, sorted order; openingKey unseals them
  signatures: string[];
  // Serialized tx.vout entries, output order
  txOuts: string[];
  // Output key and commitment (64 bytes each), output order
  outPks: string[];
  // Encrypted 8-byte amounts, output order
  ecdhInfos: string[];
  // Aggregated Bulletproof+ without V
  rsig: string;
  extra: string;
  txPrefixHash: string;
  fullMessageHash: string;
  rv: {
    // Decimal piconero
    txnFee: string;
    message: string;
    rvType: number;
  };
  openingKey: string;
};

export declare function moneroSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & MoneroSignTransactionParams
): Response<MoneroSignTransactionResult>;
