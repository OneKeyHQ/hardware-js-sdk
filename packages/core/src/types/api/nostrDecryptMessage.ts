import type { CommonParams, Response } from '../params';

export type NostrDecryptedMessage = {
  msg: string;
};

export interface NostrDecryptMessageParams {
  path: string | number[];
  pubkey: string;
  ciphertext: string;
  showOnOneKey?: boolean;
}

export type NostrDecryptedMessageResponse = {
  path: string;
  pubkey: string;
  ciphertext: string;
  decryptedMessage: string;
};

export declare function nostrDecryptMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & NostrDecryptMessageParams
): Response<NostrDecryptedMessageResponse>;
