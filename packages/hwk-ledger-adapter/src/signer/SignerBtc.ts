import { deviceActionToPromise } from './deviceActionToPromise';
import { debugError, debugLog } from '../utils/debugLog';

import type { SignerBtc as ISdkSignerBtc } from '@ledgerhq/device-signer-kit-bitcoin';
import type { SignerBtcAddress } from '../types';

// Extract parameter types from the real SignerBtc interface to avoid deep path imports.
type BtcWallet = Parameters<ISdkSignerBtc['getWalletAddress']>[0];
type BtcPsbt = Parameters<ISdkSignerBtc['signPsbt']>[1];
type BtcPsbtOptions = Parameters<ISdkSignerBtc['signPsbt']>[2];
type BtcMessageOptions = Parameters<ISdkSignerBtc['signMessage']>[2];

/** Decode hex string (with or without 0x prefix) to UTF-8 text. */
function hexToUtf8(hex: string): string {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.substring(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

/** Timeout for user-interactive operations (sign, verify). */
const INTERACTIVE_TIMEOUT_MS = 5 * 60_000;

/**
 * Wraps Ledger's BTC SDK signer (Observable-based DeviceActions) into
 * a simple async interface returning plain serializable data.
 */
export class SignerBtc {
  onInteraction?: (interaction: string) => void;

  onRegisterCanceller?: (cancel: () => void) => void;

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly _sdk: ISdkSignerBtc) {}

  async getWalletAddress(
    wallet: BtcWallet,
    addressIndex: number,
    options?: { checkOnDevice?: boolean; change?: boolean }
  ): Promise<SignerBtcAddress> {
    const action = this._sdk.getWalletAddress(wallet, addressIndex, {
      checkOnDevice: options?.checkOnDevice ?? false,
      change: options?.change ?? false,
    });
    return deviceActionToPromise<SignerBtcAddress>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller
    );
  }

  async getExtendedPublicKey(
    derivationPath: string,
    options?: { checkOnDevice?: boolean }
  ): Promise<string> {
    debugLog(
      '[SignerBtc] getExtendedPublicKey called, path:',
      derivationPath,
      'options:',
      JSON.stringify(options)
    );
    const action = this._sdk.getExtendedPublicKey(derivationPath, {
      checkOnDevice: options?.checkOnDevice ?? false,
    });
    try {
      // DMK returns { extendedPublicKey: string }, unwrap it
      const result = await deviceActionToPromise<string | { extendedPublicKey: string }>(
        action,
        this.onInteraction,
        undefined,
        this.onRegisterCanceller
      );
      debugLog(
        '[SignerBtc] getExtendedPublicKey result type:',
        typeof result,
        'value:',
        typeof result === 'string'
          ? `${result.substring(0, 20)}...`
          : JSON.stringify(result).substring(0, 50)
      );
      if (typeof result === 'string') return result;
      return result.extendedPublicKey;
    } catch (err) {
      debugError('[SignerBtc] getExtendedPublicKey error:', err);
      throw err;
    }
  }

  async getMasterFingerprint(options?: { skipOpenApp?: boolean }): Promise<Uint8Array> {
    const action = this._sdk.getMasterFingerprint(options);
    const result = await deviceActionToPromise<{ masterFingerprint: Uint8Array }>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller
    );
    return result.masterFingerprint;
  }

  /**
   * Sign a PSBT and return the array of partial signatures.
   * The `wallet` param is a DefaultWallet or WalletPolicy instance.
   * The `psbt` param can be a hex string, base64 string, or Uint8Array.
   */
  async signPsbt(wallet: BtcWallet, psbt: BtcPsbt, options?: BtcPsbtOptions): Promise<unknown[]> {
    const action = this._sdk.signPsbt(wallet, psbt, options);
    return deviceActionToPromise<unknown[]>(
      action,
      this.onInteraction,
      INTERACTIVE_TIMEOUT_MS,
      this.onRegisterCanceller
    );
  }

  /**
   * Sign a PSBT and return the fully extracted raw transaction as a hex string.
   * Like signPsbt, but also finalises the PSBT and extracts the transaction.
   */
  async signTransaction(
    wallet: BtcWallet,
    psbt: BtcPsbt,
    options?: BtcPsbtOptions
  ): Promise<string> {
    const action = this._sdk.signTransaction(wallet, psbt, options);
    return deviceActionToPromise<string>(
      action,
      this.onInteraction,
      INTERACTIVE_TIMEOUT_MS,
      this.onRegisterCanceller
    );
  }

  /**
   * Sign a message with the BTC app (BIP-137 / "Bitcoin Signed Message").
   * Returns `{ r, s, v }` signature object.
   */
  async signMessage(
    derivationPath: string,
    message: string,
    options?: BtcMessageOptions
  ): Promise<{ r: string; s: string; v: number }> {
    // DMK uses TextEncoder to convert message string to bytes.
    // We receive hex-encoded message, so decode hex -> UTF-8 text first.
    const action = this._sdk.signMessage(derivationPath, hexToUtf8(message), options);
    return deviceActionToPromise<{ r: string; s: string; v: number }>(
      action,
      this.onInteraction,
      INTERACTIVE_TIMEOUT_MS,
      this.onRegisterCanceller
    );
  }
}
