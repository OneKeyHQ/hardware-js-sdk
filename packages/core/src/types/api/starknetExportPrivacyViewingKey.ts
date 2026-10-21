import type {
  StarknetPrivacyViewingKeyDerivation,
  StarknetPublicKeyType,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

// Felts are hex strings, 0x optional.
export type StarknetExportPrivacyViewingKeyParams = {
  path: string | number[];
  // defaults to STARK
  publicKeyType?: StarknetPublicKeyType;
  chainId: string;
  accountAddress: string;
  poolAddress: string;
  // defaults to ACCOUNT_LEAF_V1
  derivationVersion?: StarknetPrivacyViewingKeyDerivation;
};

export type StarknetPrivacyViewingKey = {
  // 0x-prefixed private viewing scalar; a privacy secret, never log it
  viewingKey: string;
};

export declare function starknetExportPrivacyViewingKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & StarknetExportPrivacyViewingKeyParams
): Response<StarknetPrivacyViewingKey>;
