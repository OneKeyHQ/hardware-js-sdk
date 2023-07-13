import type { CommonParams, Response } from '../params';

export type NexaSignature = {
  index: number;
  signature: string;
};

export type NexaSignInputParams = {
  path: string;
  message: string;
  prefix: string;
};

export type NexaSignOutputParams = {
  satoshis: number | string;
  script: string;
  scriptVersion: number;
};

export type NexaSignTransactionParams = {
  inputs: NexaSignInputParams[];
};

export declare function nexaSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & NexaSignTransactionParams
): Response<NexaSignature[]>;
