import type { Response } from './response';
import type { ICommonCallParams } from './wallet';

export interface TronGetAddressParams {
  path: string;
  showOnDevice?: boolean;
}

export interface TronAddress {
  /** Base58check-encoded TRON address (starts with 'T') */
  address: string;
  path: string;
}

export interface TronSignTxParams {
  path: string;
  /** Protobuf-encoded raw transaction hex (no 0x prefix) */
  rawTxHex: string;
}

export interface TronSignedTx {
  /** 65-byte hex-encoded signature (no 0x prefix) */
  signature: string;
}

export interface TronSignMsgParams {
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
    connectId: string,
    deviceId: string,
    params: TronGetAddressParams,
    commonParams?: ICommonCallParams
  ): Promise<Response<TronAddress>>;

  tronSignTransaction(
    connectId: string,
    deviceId: string,
    params: TronSignTxParams,
    commonParams?: ICommonCallParams
  ): Promise<Response<TronSignedTx>>;

  tronSignMessage(
    connectId: string,
    deviceId: string,
    params: TronSignMsgParams,
    commonParams?: ICommonCallParams
  ): Promise<Response<TronSignature>>;
}
