import { SignatureType } from '../../api/kaspa/helpers/SignatureType';
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
    script: string;
  };
  sigOpCount?: number;
};

export type KaspaSignOutputParams = {
  satoshis: number | string;
  script: string;
  scriptVersion: number;
};

export type KaspaSignTransactionParams = {
  version: number;
  inputs: KaspaSignInputParams[];
  outputs: KaspaSignOutputParams[];
  lockTime: number | string;
  sigHashType?: SignatureType;
  sigOpCount?: number;
  subNetworkID?: string;
  scheme?: string;
  prefix?: string;
};

export declare function kaspaSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & KaspaSignTransactionParams
): Response<KaspaSignature[]>;
