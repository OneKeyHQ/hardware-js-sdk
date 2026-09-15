import { deviceActionToPromise } from './deviceActionToPromise';

import type { CancelReason } from './deviceActionToPromise';
import type { SignerTrx as ISdkSignerTrx } from '@ledgerhq/device-signer-kit-tron';

// Extract option types from the real SignerTrx interface to avoid deep path imports.
type TronAddressOptions = Parameters<ISdkSignerTrx['getAddress']>[1];
type TronTxOptions = Parameters<ISdkSignerTrx['signTransaction']>[2];
type TronMsgOptions = Parameters<ISdkSignerTrx['signPersonalMessage']>[2];

/**
 * Wraps Ledger's Tron DMK signer (Observable-based DeviceActions) into a
 * simple async interface returning plain serializable data.
 *
 * Signatures come back as raw bytes here, unlike the legacy `hw-app-trx` path
 * which returned hex. Callers hex-encode at the connector boundary so the wire
 * format the adapter exposes is unchanged.
 */
export class SignerTron {
  onInteraction?: (interaction: string) => void;

  onRegisterCanceller?: (cancel: (reason?: CancelReason) => void) => void;

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly _sdk: ISdkSignerTrx) {}

  /** Base58 Tron address plus the uncompressed public key at `derivationPath`. */
  async getAddress(
    derivationPath: string,
    options?: TronAddressOptions
  ): Promise<{ address: string; publicKey: string }> {
    const action = this._sdk.getAddress(derivationPath, options);
    const result = await deviceActionToPromise<{ address: string; publicKey: string }>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller
    );
    return { address: result.address, publicKey: result.publicKey };
  }

  /** Sign a protobuf-encoded raw transaction. */
  async signTransaction(
    derivationPath: string,
    transaction: Uint8Array,
    options?: TronTxOptions
  ): Promise<Uint8Array> {
    const action = this._sdk.signTransaction(derivationPath, transaction, options);
    return deviceActionToPromise<Uint8Array>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller
    );
  }

  /** Sign a personal message (TIP-191). */
  async signPersonalMessage(
    derivationPath: string,
    message: string | Uint8Array,
    options?: TronMsgOptions
  ): Promise<Uint8Array> {
    const action = this._sdk.signPersonalMessage(derivationPath, message, options);
    return deviceActionToPromise<Uint8Array>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller
    );
  }
}
