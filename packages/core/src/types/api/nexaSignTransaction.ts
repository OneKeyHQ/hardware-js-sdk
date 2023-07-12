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
  inputPath: string;
  message: string;
  prefix: string;
  inputCount: number;
};

export declare function nexaSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & NexaSignTransactionParams
): Response<NexaSignature[]>;
