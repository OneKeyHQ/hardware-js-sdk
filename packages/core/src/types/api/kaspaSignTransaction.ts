import type { SignatureType } from '../../api/kaspa/helpers/SignatureType';
import type { CommonParams, Response } from '../params';

export type KaspaSignature = {
  index: number;
  signature: string;
};

export type KaspaSignInputParams = {
  path: string | number[];
  prevTxId: string;
  outputIndex: number;
  sequenceNumber: number | string;
  output: {
    satoshis: number | string;
    // Required by the legacy host-prehash flow; unused by the streaming protocol.
    script?: string;
  };
  sigOpCount?: number;
};

export type KaspaSignOutputParams = {
  satoshis: number | string;
  // Streaming protocol describes outputs by address; the device builds the script itself.
  // `address` for an external output, `addressN` (BIP-32 path) for a change output.
  address?: string;
  addressN?: string | number[];
  // Legacy host-prehash fields, unused by the streaming protocol but kept for compatibility.
  script?: string;
  scriptVersion?: number;
};

// Referenced (previous) transactions for the streaming protocol's input
// verification: the device may ask for the transactions the inputs spend from
// (selected by prev_tx_id) to verify input amounts on-device.
export type KaspaRefTransactionInput = {
  prevTxId: string;
  outputIndex: number;
  sequenceNumber: number | string;
};

export type KaspaRefTransactionOutput = {
  satoshis: number | string;
  scriptVersion?: number;
  script: string;
};

export type KaspaRefTransaction = {
  txId: string;
  version: number;
  inputs: KaspaRefTransactionInput[];
  outputs: KaspaRefTransactionOutput[];
  lockTime?: number | string;
  subNetworkID?: string;
  gas?: number | string;
  payload?: string;
};

export type KaspaSignTransactionParams = {
  version: number;
  inputs: KaspaSignInputParams[];
  outputs: KaspaSignOutputParams[];
  lockTime: number | string;
  sigHashType?: SignatureType;
  sigOpCount?: number;
  subNetworkID?: string;
  // Optional transaction payload (hex), streamed to the device in chunks.
  payload?: string;
  gas?: number | string;
  // Previous transactions referenced by the inputs, required only when the
  // device requests them for on-device input-amount verification.
  refTxs?: KaspaRefTransaction[];
  scheme?: string;
  prefix?: string;
  useTweak?: boolean; // default is true
};

export declare function kaspaSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & KaspaSignTransactionParams
): Response<KaspaSignature[]>;
