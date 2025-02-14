import type { CommonParams, Response } from '../params';

export type SolSignMessageResponse = {
  signature: string;
  pub?: string;
};

export type SolSignMessageParams = {
  path: string | number[];
  messageHex: string;
};

export declare function solSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & SolSignMessageParams
): Response<SolSignMessageResponse>;
