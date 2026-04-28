import { hexToBytes } from '@onekeyfe/hwk-adapter-core';

import { deviceActionToPromise } from './deviceActionToPromise';
import { debugLog } from '../utils/debugLog';

import type { CancelReason } from './deviceActionToPromise';
import type { SignerEth as ISdkSignerEth, TypedData } from '@ledgerhq/device-signer-kit-ethereum';
import type { SignerEvmAddress, SignerEvmSignature } from '../types';

/** Timeout for user-interactive operations (verify address, sign). */
const INTERACTIVE_TIMEOUT_MS = 5 * 60_000;

/**
 * Wraps Ledger's SDK signer (Observable-based DeviceActions) into
 * a simple async interface returning plain serializable data.
 */
export class SignerEth {
  onInteraction?: (interaction: string) => void;

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly _sdk: ISdkSignerEth) {}

  /**
   * Optional callback registered per-call so the caller can obtain a canceller
   * for the underlying DeviceAction. Caller can invoke it to release DMK's
   * IntentQueue slot and unsubscribe from the action's observable.
   */
  onRegisterCanceller?: (cancel: (reason?: CancelReason) => void) => void;

  async getAddress(
    derivationPath: string,
    options?: { checkOnDevice?: boolean }
  ): Promise<SignerEvmAddress> {
    const checkOnDevice = options?.checkOnDevice ?? false;
    debugLog('[DMK] getAddress → DMK:', { derivationPath, checkOnDevice });
    const action = this._sdk.getAddress(derivationPath, {
      checkOnDevice,
    });
    // checkOnDevice needs user interaction → long timeout; otherwise default 30s
    const timeout = checkOnDevice ? INTERACTIVE_TIMEOUT_MS : undefined;
    return deviceActionToPromise<SignerEvmAddress>(
      action,
      this.onInteraction,
      timeout,
      this.onRegisterCanceller
    );
  }

  async signTransaction(
    derivationPath: string,
    serializedTxHex: string
  ): Promise<SignerEvmSignature> {
    const action = this._sdk.signTransaction(derivationPath, hexToBytes(serializedTxHex));
    return deviceActionToPromise<SignerEvmSignature>(
      action,
      this.onInteraction,
      INTERACTIVE_TIMEOUT_MS,
      this.onRegisterCanceller
    );
  }

  async signMessage(derivationPath: string, message: string): Promise<SignerEvmSignature> {
    // DMK treats string as ASCII text (addAsciiStringToData), but we receive
    // hex-encoded message bytes. Decode to Uint8Array so DMK uses
    // addBufferToData — matching the OneKey SDK's behavior.
    const action = this._sdk.signMessage(derivationPath, hexToBytes(message));
    return deviceActionToPromise<SignerEvmSignature>(
      action,
      this.onInteraction,
      INTERACTIVE_TIMEOUT_MS,
      this.onRegisterCanceller
    );
  }

  async signTypedData(derivationPath: string, data: TypedData): Promise<SignerEvmSignature> {
    const action = this._sdk.signTypedData(derivationPath, data);
    return deviceActionToPromise<SignerEvmSignature>(
      action,
      this.onInteraction,
      INTERACTIVE_TIMEOUT_MS,
      this.onRegisterCanceller
    );
  }
}
