import type { Response } from './response';
import type { ICommonCallParams } from './wallet';

export interface BtcGetAddressParams {
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

export interface BtcGetPublicKeyParams {
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

export interface BtcSignTxParams {
  psbt?: string;
  inputs?: BtcTxInput[];
  outputs?: BtcTxOutput[];
  refTxs?: BtcRefTransaction[];
  coin: string;
  locktime?: number;
  version?: number;
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
}

export interface BtcTxOutput {
  address?: string;
  path?: string;
  amount: string;
  scriptType?: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
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
}

export interface BtcSignedTx {
  serializedTx: string;
  /** Present when the wallet returns per-input sigs separately (e.g. Trezor). */
  signatures?: string[];
  txid?: string;
}

export interface BtcSignPsbtParams {
  psbt: string;
  coin?: string;
  /** Account-level derivation path (e.g. "84'/0'/0'") for wallet template. */
  path?: string;
}

export interface BtcSignedPsbt {
  signedPsbt: string;
}

export interface BtcSignMsgParams {
  path: string;
  message: string;
  coin?: string;
}

export interface BtcSignature {
  signature: string;
  /** Optional — not all adapters return it (e.g. Ledger DMK). Derive via btcGetAddress if needed. */
  address?: string;
}

export interface IBtcMethods {
  btcGetAddress(
    connectId: string,
    deviceId: string,
    params: BtcGetAddressParams,
    commonParams?: ICommonCallParams
  ): Promise<Response<BtcAddress>>;

  btcGetPublicKey(
    connectId: string,
    deviceId: string,
    params: BtcGetPublicKeyParams,
    commonParams?: ICommonCallParams
  ): Promise<Response<BtcPublicKey>>;

  btcSignTransaction(
    connectId: string,
    deviceId: string,
    params: BtcSignTxParams,
    commonParams?: ICommonCallParams
  ): Promise<Response<BtcSignedTx>>;

  btcSignPsbt(
    connectId: string,
    deviceId: string,
    params: BtcSignPsbtParams,
    commonParams?: ICommonCallParams
  ): Promise<Response<BtcSignedPsbt>>;

  btcSignMessage(
    connectId: string,
    deviceId: string,
    params: BtcSignMsgParams,
    commonParams?: ICommonCallParams
  ): Promise<Response<BtcSignature>>;

  btcGetMasterFingerprint(
    connectId: string,
    deviceId: string,
    commonParams?: ICommonCallParams
  ): Promise<Response<{ masterFingerprint: string }>>;
}
