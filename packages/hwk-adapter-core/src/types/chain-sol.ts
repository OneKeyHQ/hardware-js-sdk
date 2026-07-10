import type { PassphraseStateAware } from './passphrase';
import type { Response } from './response';
import type { IHardwareCallParams, NullableCallArg } from './wallet';

export interface SolGetAddressParams extends PassphraseStateAware {
  path: string;
  showOnDevice?: boolean;
}

export interface SolAddress {
  /** Base58-encoded Solana address — this is also the Ed25519 public key. */
  address: string;
  path: string;
}

export interface SolSignTxParams extends PassphraseStateAware {
  path: string;
  /** Hex-encoded serialized transaction bytes (no 0x prefix) */
  serializedTx: string;
  additionalInfo?: {
    /** Trezor Solana token definition bytes as a hex string. */
    encodedToken?: string;
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

export interface SolSignMsgParams extends PassphraseStateAware {
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
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<SolGetAddressParams>>
  ): Promise<Response<SolAddress>>;

  solSignTransaction(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<SolSignTxParams>>
  ): Promise<Response<SolSignedTx>>;

  solSignMessage(
    connectId?: NullableCallArg<string>,
    deviceId?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<SolSignMsgParams>>
  ): Promise<Response<SolSignature>>;
}
