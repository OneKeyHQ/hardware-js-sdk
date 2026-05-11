import type { Response } from './response';

export interface EvmGetAddressParams {
  path: string;
  showOnDevice?: boolean;
  chainId?: number;
}

export interface EvmAddress {
  address: string;
  path: string;
  /** Device-reported secp256k1 public key; populated when the transport exposes it. */
  publicKey?: string;
}

export interface EvmSignTxParams {
  path: string;
  /**
   * RLP-serialized transaction hex (0x-prefixed or plain).
   * When provided, the connector uses this directly instead of individual fields.
   * Required for Ledger; Trezor may use individual fields instead.
   */
  serializedTx?: string;
  /** Contract address or recipient. Optional for contract deployment transactions. */
  to?: string;
  value?: string;
  chainId?: number;
  nonce?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  accessList?: Array<{ address: string; storageKeys: string[] }>;
  data?: string;
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

export interface EvmSignMsgParams {
  path: string;
  message: string;
  hex?: boolean;
}

export type EvmSignTypedDataParams = EvmSignTypedDataFull | EvmSignTypedDataHash;

export interface EvmSignTypedDataFull {
  path: string;
  /** Defaults to `'full'` when omitted. */
  mode?: 'full';
  data: {
    domain: EIP712Domain;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  };
  metamaskV4Compat?: boolean;
}

export interface EvmSignTypedDataHash {
  path: string;
  mode: 'hash';
  domainSeparatorHash: string;
  messageHash: string;
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
    connectId: string,
    deviceId: string,
    params: EvmGetAddressParams
  ): Promise<Response<EvmAddress>>;

  evmSignTransaction(
    connectId: string,
    deviceId: string,
    params: EvmSignTxParams
  ): Promise<Response<EvmSignedTx>>;

  evmSignMessage(
    connectId: string,
    deviceId: string,
    params: EvmSignMsgParams
  ): Promise<Response<EvmSignature>>;

  evmSignTypedData(
    connectId: string,
    deviceId: string,
    params: EvmSignTypedDataParams
  ): Promise<Response<EvmSignature>>;
}
