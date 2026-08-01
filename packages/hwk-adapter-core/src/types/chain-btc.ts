import type { PassphraseStateAware } from './passphrase';
import type { Response } from './response';
import type { IHardwareCallParams, IHardwareCommonCallParams, NullableCallArg } from './wallet';

export interface BtcGetAddressParams extends PassphraseStateAware {
  path: string;
  coin?: string;
  showOnDevice?: boolean;
  scriptType?: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
  addressIndex?: number;
  change?: boolean;
}

export interface BtcAddress {
  address: string;
  path: string;
}

export interface BtcGetPublicKeyParams extends PassphraseStateAware {
  path: string;
  coin?: string;
  showOnDevice?: boolean;
}

export interface BtcPublicKey {
  xpub: string;
  publicKey: string;
  /** Parent key fingerprint (BIP-32), not the master fingerprint. */
  fingerprint: number;
  chainCode: string;
  path: string;
  depth: number;
}

export interface BtcSignTxParams extends PassphraseStateAware {
  psbt?: string;
  inputs?: BtcTxInput[];
  outputs?: BtcTxOutput[];
  paymentRequests?: BtcPaymentRequest[];
  refTxs?: BtcRefTransaction[];
  coin: string;
  locktime?: number;
  version?: number;
  timestamp?: number;
  expiry?: number;
  versionGroupId?: number;
  branchId?: number;
  /** Account-level derivation path (e.g. "84'/0'/0'") for wallet template. */
  path?: string;
}

export interface BtcTxInput {
  path: string;
  prevHash: string;
  prevIndex: number;
  amount: string;
  scriptType?: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
  sequence?: number;
  origHash?: string;
  origIndex?: number;
  scriptSig?: string;
  witness?: string;
  ownershipProof?: string;
  commitmentData?: string;
}

export interface BtcTxOutput {
  address?: string;
  path?: string;
  opReturnData?: string;
  amount: string;
  scriptType?: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
  paymentReqIndex?: number;
  origHash?: string;
  origIndex?: number;
}

export interface BtcPaymentRequestMemo {
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

export interface BtcPaymentRequest {
  nonce?: string;
  recipientName: string;
  memos?: BtcPaymentRequestMemo[];
  /** Decimal string in satoshis/subunits; SDK encodes it as SLIP-24 uint64 LE hex. */
  amount?: string;
  signature: string;
}

export interface BtcRefTransaction {
  hash: string;
  version: number;
  inputs: Array<{
    prevHash: string;
    prevIndex: number;
    script: string;
    sequence: number;
  }>;
  outputs: Array<{
    amount: string;
    scriptPubKey: string;
  }>;
  locktime: number;
  /** Original transaction inputs used by Trezor RBF verification (TXORIGINPUT). */
  origInputs?: BtcTxInput[];
  /** Original transaction outputs used by Trezor RBF verification (TXORIGOUTPUT). */
  origOutputs?: BtcTxOutput[];
  extraData?: string;
  timestamp?: number;
  expiry?: number;
  versionGroupId?: number;
  branchId?: number;
}

export interface BtcSignedTx {
  serializedTx: string;
  /** Present when the wallet returns per-input sigs separately (e.g. Trezor). */
  signatures?: string[];
  txid?: string;
}

export interface BtcSignPsbtParams extends PassphraseStateAware {
  psbt: string;
  coin?: string;
  /** Account-level derivation path (e.g. "84'/0'/0'") for wallet template. */
  path?: string;
}

export interface BtcSignedPsbt {
  signedPsbt: string;
}

export interface BtcSignMsgParams extends PassphraseStateAware {
  path: string;
  message: string;
  coin?: string;
  hex?: boolean;
  noScriptType?: boolean;
}

export interface BtcSignature {
  signature: string;
  /** Optional — not all adapters return it (e.g. Ledger DMK). Derive via btcGetAddress if needed. */
  address?: string;
}

export interface IBtcMethods {
  btcGetAddress(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<BtcGetAddressParams>>
  ): Promise<Response<BtcAddress>>;

  btcGetPublicKey(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<BtcGetPublicKeyParams>>
  ): Promise<Response<BtcPublicKey>>;

  btcSignTransaction(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<BtcSignTxParams>>
  ): Promise<Response<BtcSignedTx>>;

  btcSignPsbt(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<BtcSignPsbtParams>>
  ): Promise<Response<BtcSignedPsbt>>;

  btcSignMessage(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<BtcSignMsgParams>>
  ): Promise<Response<BtcSignature>>;

  btcGetMasterFingerprint(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCommonCallParams>
  ): Promise<Response<{ masterFingerprint: string }>>;
}
