import type { CommonParams, Response } from '../params';

export type NostrEncryptedMessage = {
  msg: string;
};

export interface NostrEncryptMessageParams {
  path: string | number[];
  pubkey: string;
  plaintext: string;
  showOnOneKey?: boolean;
}

export type NostrEncryptedMessageResponse = {
  path: string;
  pubkey: string;
  plaintext: string;
  encryptedMessage: string;
};

export declare function nostrEncryptMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & NostrEncryptMessageParams
): Response<NostrEncryptedMessageResponse>;
