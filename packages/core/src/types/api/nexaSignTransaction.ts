import { SignatureType } from '../../api/nexa/helpers/SignatureType';
import type { CommonParams, Response } from '../params';

export type NexaSignature = {
  index: number;
  signature: string;
};

export type NexaSignInputParams = {
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

export type NexaSignOutputParams = {
  satoshis: number | string;
  script: string;
  scriptVersion: number;
};

export type NexaSignTransactionParams = {
  version: number;
  inputs: NexaSignInputParams[];
  outputs: NexaSignOutputParams[];
  lockTime: number | string;
  sigHashType?: SignatureType;
  sigOpCount?: number;
  subNetworkID?: string;
  scheme?: string;
  prefix?: string;
};

export declare function nexaSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & NexaSignTransactionParams
): Response<NexaSignature[]>;
