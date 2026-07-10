import type { PassphraseStateAware } from './passphrase';
import type { Response } from './response';
import type { IHardwareCallParams, NullableCallArg } from './wallet';

export interface TronGetAddressParams extends PassphraseStateAware {
  path: string;
  showOnDevice?: boolean;
}

export interface TronAddress {
  /** Base58check-encoded TRON address (starts with 'T') */
  address: string;
  path: string;
}

/** TRON network resource, used by freeze/unfreeze contracts. */
export type TronResource = 'BANDWIDTH' | 'ENERGY';

export interface TronTransferContract {
  /**
   * Recipient address as hex, 0x41-prefixed (`41` + 20-byte hash, 42 hex chars).
   * A leading `0x` is tolerated. Base58 (`T...`) is NOT accepted — convert first.
   */
  toAddress: string;
  /** Amount in sun (1 TRX = 1e6 sun). */
  amount: string | number;
}

export interface TronTriggerSmartContract {
  /** Smart-contract address, hex 0x41-prefixed. */
  contractAddress: string;
  /** ABI-encoded call data, hex (with or without `0x`). */
  data: string;
}

export interface TronFreezeBalanceV2Contract {
  /** Amount to freeze, in sun. */
  balance: number;
  resource?: TronResource;
}

export interface TronUnfreezeBalanceV2Contract {
  /** Amount to unfreeze, in sun. */
  balance: number;
  resource?: TronResource;
}

export interface TronVote {
  /** Witness (SR) address, hex 0x41-prefixed. */
  voteAddress: string;
  voteCount: number;
}

export interface TronVoteWitnessContract {
  votes: TronVote[];
}

/** Withdraw-expired-unfreeze carries no fields beyond the implicit owner. */
export type TronWithdrawExpireUnfreezeContract = Record<string, never>;

/**
 * Exactly one field must be set — mirrors OneKey's `TronTransactionContract`.
 * Only the six contract types Trezor firmware/protobuf supports are exposed.
 */
export interface TronContract {
  transferContract?: TronTransferContract;
  triggerSmartContract?: TronTriggerSmartContract;
  freezeBalanceV2Contract?: TronFreezeBalanceV2Contract;
  unfreezeBalanceV2Contract?: TronUnfreezeBalanceV2Contract;
  voteWitnessContract?: TronVoteWitnessContract;
  withdrawExpireUnfreezeContract?: TronWithdrawExpireUnfreezeContract;
}

/**
 * Cross-vendor TRON sign params. Adapters consume different shapes:
 *
 *  - **Ledger** signs the serialized transaction directly → needs `rawTxHex`.
 *  - **Trezor** runs a two-step contract flow → needs the structured fields
 *    (`ownerAddress` + `refBlock*` + `contract` …), mirroring OneKey hd-core.
 *
 * Both groups are optional at the type level; provide whichever your target
 * vendor needs (or both for a vendor-agnostic call). Each adapter validates the
 * fields it requires at runtime and ignores the rest — neither re-decodes the
 * other's representation.
 */
export interface TronSignTxParams extends PassphraseStateAware {
  path: string;
  /**
   * Protobuf-encoded raw TRON transaction, hex (with or without `0x`).
   * Consumed by Ledger; ignored by Trezor.
   */
  rawTxHex?: string;
  /**
   * The signer's own TRON address, hex 0x41-prefixed. Required by Trezor
   * (its contract messages carry an explicit `owner_address`); Ledger derives
   * it from `rawTxHex`.
   */
  ownerAddress?: string;
  /** Last 2 bytes of the reference block height, hex (4 chars). Trezor. */
  refBlockBytes?: string;
  /** Middle 8 bytes of the reference block hash, hex (16 chars). Trezor. */
  refBlockHash?: string;
  /** Expiration timestamp, milliseconds. Trezor. */
  expiration?: number;
  /** Transaction timestamp, milliseconds. Trezor. */
  timestamp?: number;
  /** Energy fee cap in sun (TriggerSmartContract only). Trezor. */
  feeLimit?: number;
  /** Optional memo/data, hex (with or without `0x`). Trezor. */
  data?: string;
  /** Exactly one contract — required by Trezor. */
  contract?: TronContract;
}

export interface TronSignedTx {
  /** 65-byte hex-encoded signature (no 0x prefix) */
  signature: string;
  /**
   * The transaction's `raw_data`, re-encoded host-side from the structured
   * fields the device signed (hex, no prefix). The signature covers exactly
   * this serialization, so callers should broadcast THIS rather than a
   * pre-existing raw_data blob. Present only for contract types the host can
   * re-encode (transfer / triggerSmart); `undefined` otherwise. Despite the
   * historic `serializedTx` name, this is the TRON `raw_data_hex` payload, not
   * trezor-suite's full broadcast transaction envelope.
   */
  serializedTx?: string;
}

export interface TronSignMsgParams extends PassphraseStateAware {
  path: string;
  /** Message hex (no 0x prefix) */
  messageHex: string;
}

export interface TronSignature {
  /** 65-byte hex-encoded signature (no 0x prefix) */
  signature: string;
}

export interface ITronMethods {
  tronGetAddress(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<TronGetAddressParams>>
  ): Promise<Response<TronAddress>>;

  tronSignTransaction(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<TronSignTxParams>>
  ): Promise<Response<TronSignedTx>>;

  tronSignMessage(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<TronSignMsgParams>>
  ): Promise<Response<TronSignature>>;
}
