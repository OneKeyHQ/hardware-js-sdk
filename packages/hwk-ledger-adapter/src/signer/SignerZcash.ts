import { deviceActionToPromise } from './deviceActionToPromise';

import type { CancelReason } from './deviceActionToPromise';
import type {
  FullViewingKeyOptions,
  GetFullViewingKeyDAOutput,
  GetShieldedAddressDAOutput,
  SignerZcash as ISdkSignerZcash,
} from '@ledgerhq/device-signer-kit-zcash';

/**
 * Wraps Ledger's Zcash SDK signer (Observable-based DeviceActions) into a
 * simple async interface. Only the viewing-key and shielded-address reads are
 * exposed; PCZT signing goes through a different host-side pipeline.
 */
export class SignerZcash {
  onInteraction?: (interaction: string) => void;

  onRegisterCanceller?: (cancel: (reason?: CancelReason) => void) => void;

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly _sdk: ISdkSignerZcash) {}

  /** GET_VK: UFVK string (default) or raw 96-byte Orchard FVK. */
  async getFullViewingKey(
    derivationPath: string,
    options?: FullViewingKeyOptions
  ): Promise<GetFullViewingKeyDAOutput> {
    const action = this._sdk.getFullViewingKey(derivationPath, options);
    return deviceActionToPromise<GetFullViewingKeyDAOutput>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller
    );
  }

  /** GET_SHIELDED_ADDRESS: single-Orchard-receiver UA for a 5-level transparent path. */
  async getShieldedAddress(
    derivationPath: string,
    options?: { checkOnDevice?: boolean; skipOpenApp?: boolean }
  ): Promise<GetShieldedAddressDAOutput> {
    const action = this._sdk.getShieldedAddress(derivationPath, options);
    return deviceActionToPromise<GetShieldedAddressDAOutput>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller
    );
  }
}
