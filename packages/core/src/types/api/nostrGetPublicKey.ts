import type { CommonParams, Response } from '../params';

export type NostrPublicKey = {
  npub?: string;
  publickey?: string;
};

export interface NostrPublicKeyParams {
  path: string | number[];
  showOnOneKey?: boolean;
}

export declare function nostrGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & NostrPublicKeyParams
): Response<NostrPublicKey>;

export declare function nostrGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: NostrPublicKeyParams[] }
): Response<Array<NostrPublicKey>>;
