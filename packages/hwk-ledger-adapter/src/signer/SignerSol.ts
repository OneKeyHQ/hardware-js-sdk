import type { SignerSolana as ISdkSignerSol } from '@ledgerhq/device-signer-kit-solana';
import { deviceActionToPromise } from './deviceActionToPromise';

// Extract parameter types from the real SignerSolana interface to avoid deep path imports.
type SolTxOptions = Parameters<ISdkSignerSol['signTransaction']>[2];
type SolMsgOptions = Parameters<ISdkSignerSol['signMessage']>[2];

/**
 * Wraps Ledger's Solana SDK signer (Observable-based DeviceActions) into
 * a simple async interface returning plain serializable data.
 *
 * The Solana signer's `getAddress` returns a base58-encoded Ed25519 public key,
 * which is also the Solana address.
 */
export class SignerSol {
  onInteraction?: (interaction: string) => void;

  constructor(private readonly _sdk: ISdkSignerSol) {}

  /**
   * Get the Solana address (base58-encoded Ed25519 public key) at the given derivation path.
   */
  async getAddress(derivationPath: string, options?: { checkOnDevice?: boolean }): Promise<string> {
    const action = this._sdk.getAddress(derivationPath, {
      checkOnDevice: options?.checkOnDevice ?? false,
    });
    return deviceActionToPromise<string>(action, this.onInteraction);
  }

  /**
   * Sign a Solana transaction.
   */
  async signTransaction(
    derivationPath: string,
    transaction: Uint8Array,
    options?: SolTxOptions
  ): Promise<Uint8Array> {
    const action = this._sdk.signTransaction(derivationPath, transaction, options);
    return deviceActionToPromise<Uint8Array>(action, this.onInteraction);
  }

  /**
   * Sign a message with the Solana app.
   * DMK returns { signature: string } for signMessage (unlike signTransaction which returns Uint8Array).
   */
  async signMessage(
    derivationPath: string,
    message: string | Uint8Array,
    options?: SolMsgOptions
  ): Promise<{ signature: string }> {
    const action = this._sdk.signMessage(derivationPath, message, options);
    return deviceActionToPromise<{ signature: string }>(action, this.onInteraction);
  }
}
