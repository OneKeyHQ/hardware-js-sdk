import type {
  SolanaOffChainMessageFormat,
  SolanaOffChainMessageVersion,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type SolSignOffchainMessageResponse = {
  signature: string;
  pub?: string;
};

export type SolSignOffchainMessageParams = {
  path: string | number[];
  messageHex: string;
  messageVersion?: SolanaOffChainMessageVersion;
  messageFormat?: SolanaOffChainMessageFormat;
  applicationDomainHex?: string;
  /** 32-byte public keys encoded as hex, strictly sorted and unique. */
  requiredSigners?: string[];
};

export declare function solSignOffchainMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & SolSignOffchainMessageParams
): Response<SolSignOffchainMessageResponse>;
