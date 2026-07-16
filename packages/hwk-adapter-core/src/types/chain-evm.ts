import type { PassphraseStateAware } from './passphrase';
import type { Response } from './response';
import type { IHardwareCallParams, NullableCallArg } from './wallet';

export interface EvmGetAddressParams extends PassphraseStateAware {
  path: string;
  showOnDevice?: boolean;
  chainId?: number;
  ethereumDefinitions?: EvmEthereumDefinitions;
}

export interface EvmAddress {
  address: string;
  path: string;
  /** Device-reported secp256k1 public key; populated when the transport exposes it. */
  publicKey?: string;
}

interface EvmSignTxBaseParams extends PassphraseStateAware {
  path: string;
  chainId?: number;
}

/** Ledger shape: the whole RLP-serialized tx (0x-prefixed or plain hex); structured fields forbidden. */
export interface EvmSignTxLedgerParams extends EvmSignTxBaseParams {
  serializedTx: string;
  to?: never;
  value?: never;
  nonce?: never;
  gasLimit?: never;
  gasPrice?: never;
  txType?: never;
  maxFeePerGas?: never;
  maxPriorityFeePerGas?: never;
  accessList?: never;
  data?: never;
  paymentRequest?: never;
  ethereumDefinitions?: never;
}

/** Trezor shape: structured EthereumSignTx protobuf fields; serializedTx forbidden. */
export interface EvmSignTxTrezorParams extends EvmSignTxBaseParams {
  serializedTx?: never;
  /** Contract address or recipient. Optional for contract deployment transactions. */
  to?: string;
  value?: string;
  nonce?: string;
  gasLimit?: string;
  gasPrice?: string;
  txType?: number;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  accessList?: Array<{ address: string; storageKeys: string[] }>;
  data?: string;
  paymentRequest?: EvmPaymentRequest;
  ethereumDefinitions?: EvmEthereumDefinitions;
}

/** Mutually exclusive vendor shapes; each adapter narrows to its own. */
export type EvmSignTxParams = EvmSignTxLedgerParams | EvmSignTxTrezorParams;

export interface EvmEthereumDefinitions {
  /** Trezor Ethereum network definition bytes as a hex string. */
  encodedNetwork?: string;
  /** Trezor Ethereum token definition bytes as a hex string. */
  encodedToken?: string;
}

export interface EvmPaymentRequestMemo {
  textMemo?: {
    text: string;
  };
  textDetailsMemo?: {
    title: string;
    text: string;
  };
  refundMemo?: {
    address: string;
    addressN?: number[];
    mac: string;
  };
  coinPurchaseMemo?: {
    coinType: number;
    amount: string;
    address: string;
    addressN?: number[];
    mac: string;
  };
}

export interface EvmPaymentRequest {
  nonce?: string;
  recipientName: string;
  memos?: EvmPaymentRequestMemo[];
  /** Decimal string in subunits; SDK encodes it as SLIP-24 uint256 LE hex. */
  amount?: string;
  signature: string;
}

export interface EvmSignedTx {
  /** Recovery id as `0x`-prefixed hex string. */
  v: string;
  /** ECDSA `r` value as `0x`-prefixed, zero-padded 64-char hex string (32 bytes). */
  r: string;
  /** ECDSA `s` value as `0x`-prefixed, zero-padded 64-char hex string (32 bytes). */
  s: string;
  serializedTx?: string;
}

export interface EvmSignMsgParams extends PassphraseStateAware {
  path: string;
  message: string;
  chainId?: number;
  hex?: boolean;
  ethereumDefinitions?: EvmEthereumDefinitions;
}

export type EvmSignTypedDataParams = EvmSignTypedDataFull | EvmSignTypedDataHash;

export interface EvmSignTypedDataFull extends PassphraseStateAware {
  path: string;
  chainId?: number;
  /** Defaults to `'full'` when omitted. */
  mode?: 'full';
  ethereumDefinitions?: EvmEthereumDefinitions;
  data: {
    domain: EIP712Domain;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  };
  metamaskV4Compat?: boolean;
  showMessageHash?: boolean;
  /**
   * Optional host-computed hashes. Core Trezor models still use full typed-data
   * signing for display, while Trezor One can fall back to typed-hash signing
   * when firmware cannot compute the hashes itself.
   */
  domainSeparatorHash?: string;
  messageHash?: string;
}

export interface EvmSignTypedDataHash extends PassphraseStateAware {
  path: string;
  chainId?: number;
  mode: 'hash';
  domainSeparatorHash: string;
  messageHash: string;
  ethereumDefinitions?: EvmEthereumDefinitions;
}

export interface EIP712Domain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
  salt?: string;
  [key: string]: unknown;
}

export interface EvmSignature {
  /** `0x`-prefixed hex string (r + s + v). */
  signature: string;
  address?: string;
}

export interface IEvmMethods {
  evmGetAddress(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<EvmGetAddressParams>>
  ): Promise<Response<EvmAddress>>;

  evmSignTransaction(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<EvmSignTxParams>>
  ): Promise<Response<EvmSignedTx>>;

  evmSignMessage(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<EvmSignMsgParams>>
  ): Promise<Response<EvmSignature>>;

  evmSignTypedData(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<EvmSignTypedDataParams>>
  ): Promise<Response<EvmSignature>>;
}
