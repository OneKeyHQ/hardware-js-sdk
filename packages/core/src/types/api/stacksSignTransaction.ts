import type { CommonParams, Response } from '../params';

export type StacksSignature = {
  index: number;
  signature: string;
};

export type StacksSignInputParams = {
  path: string;
  message: string;
  prefix: string;
};

export type StacksSignOutputParams = {
  satoshis: number | string;
  script: string;
  scriptVersion: number;
};

export type StacksSignTransactionParams = {
  inputs: StacksSignInputParams[];
};

export declare function stacksSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & StacksSignTransactionParams
): Response<StacksSignature[]>;
