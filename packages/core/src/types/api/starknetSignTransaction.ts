import type {
  StarknetDAMode,
  StarknetPrivacyViewingKeyDerivation,
  StarknetPublicKeyType,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

// uint64: a safe integer, a decimal string, or a 0x-prefixed hex string
export type StarknetUint64 = string | number;

export type StarknetResourceBound = {
  maxAmount: StarknetUint64;
  // u128 as a hex string, 0x optional
  maxPricePerUnit: string;
};

export type StarknetResourceBounds = {
  l1Gas: StarknetResourceBound;
  l2Gas: StarknetResourceBound;
  l1DataGas: StarknetResourceBound;
};

export type StarknetInvokeV3Params = {
  senderAddress: string;
  // every felt of the __execute__ calldata; streamed to the device on request
  calldata: string[];
  accountDeploymentData?: string[];
  // proven (privacy) transactions only
  proofFacts?: string[];
};

export type StarknetDeployAccountV3Params = {
  classHash: string;
  contractAddressSalt: string;
  constructorCalldata: string[];
  // compare-only hint for the device
  expectedContractAddress?: string;
};

// Felts are hex strings, 0x optional. Exactly one of invokeV3 / deployAccountV3.
export type StarknetSignTransactionParams = {
  path: string | number[];
  // defaults to STARK
  publicKeyType?: StarknetPublicKeyType;
  chainId: string;
  nonce: string;
  resourceBounds: StarknetResourceBounds;
  tip?: StarknetUint64;
  paymasterData?: string[];
  // default L1
  nonceDataAvailabilityMode?: StarknetDAMode;
  feeDataAvailabilityMode?: StarknetDAMode;
  // required by the device for privacy pool transactions, forbidden otherwise
  privacyViewingKeyDerivation?: StarknetPrivacyViewingKeyDerivation;
  invokeV3?: StarknetInvokeV3Params;
  deployAccountV3?: StarknetDeployAccountV3Params;
};

export type StarknetSignedTx = {
  // 0x-prefixed felt computed by the device
  transactionHash: string;
  // 0x-prefixed; STARK: r[32] || s[32], SECP256K1: recovery_id || r[32] || s[32]
  signature: string;
};

export declare function starknetSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & StarknetSignTransactionParams
): Response<StarknetSignedTx>;
