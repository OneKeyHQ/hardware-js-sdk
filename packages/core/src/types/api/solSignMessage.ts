import { SolanaMessageFormat, SolanaMessageVersion } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type SolSignedMessage = {
  signature: string;
  publicKey: string;
};

export type SolSignMessageParams = {
  path: string | number[];
  messageHex: string;
  messageVersion?: SolanaMessageVersion;
  messageFormat?: SolanaMessageFormat;
  applicationDomainHex?: string;
};

export declare function solSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & SolSignMessageParams
): Response<SolSignedMessage>;
