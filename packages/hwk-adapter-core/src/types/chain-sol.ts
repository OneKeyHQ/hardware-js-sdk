import type { Response } from './response';

export interface SolGetAddressParams {
  path: string;
  showOnDevice?: boolean;
}

export interface SolAddress {
  /** Base58-encoded Solana address — this is also the Ed25519 public key. */
  address: string;
  path: string;
}

export interface SolSignTxParams {
  path: string;
  /** Hex-encoded serialized transaction bytes (no 0x prefix) */
  serializedTx: string;
  additionalInfo?: {
    tokenAccountsInfos?: Array<{
      baseAddress: string;
      tokenProgram: string;
      tokenMint: string;
      tokenAccount: string;
    }>;
  };
}

export interface SolSignedTx {
  /** Hex-encoded Ed25519 signature (no 0x prefix) */
  signature: string;
}

export interface SolSignMsgParams {
  path: string;
  /** Message bytes as hex string (no 0x prefix) */
  message: string;
}

export interface SolSignature {
  /** Hex-encoded Ed25519 signature (no 0x prefix) */
  signature: string;
}

export interface ISolMethods {
  solGetAddress(
    connectId: string,
    deviceId: string,
    params: SolGetAddressParams
  ): Promise<Response<SolAddress>>;

  solSignTransaction(
    connectId: string,
    deviceId: string,
    params: SolSignTxParams
  ): Promise<Response<SolSignedTx>>;

  solSignMessage(
    connectId: string,
    deviceId: string,
    params: SolSignMsgParams
  ): Promise<Response<SolSignature>>;
}
