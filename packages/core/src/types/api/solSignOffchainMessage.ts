import { SolanaMessageFormat, SolanaMessageVersion } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type SolSignOffchainMessageResponse = {
  signature: string;
  publicKey: string;
};

export type SolSignOffchainMessageParams = {
  path: string | number[];
  messageHex: string;
  messageVersion?: SolanaMessageVersion;
  messageFormat?: SolanaMessageFormat;
  applicationDomainHex?: string;
};

export declare function solSignOffchainMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & SolSignOffchainMessageParams
): Response<SolSignOffchainMessageResponse>;
