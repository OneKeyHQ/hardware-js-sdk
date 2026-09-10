import type { PassphraseStateAware } from './passphrase';

/** Which `GET_VK` encoding the Ledger Zcash app should return. */
export type ZcashFullViewingKeyMode = 'ufvk' | 'orchardFvk';

export interface ZcashGetFullViewingKeyParams extends PassphraseStateAware {
  /** BIP44 account path `m/44'/133'/a'` (any deeper transparent path is accepted; only the account level is used). */
  path: string;
  /** Default `ufvk`. */
  mode?: ZcashFullViewingKeyMode;
}

export interface ZcashFullViewingKey {
  path: string;
  mode: ZcashFullViewingKeyMode;
  /** ZIP-316 bech32m UFVK string (mode `ufvk`). */
  ufvk?: string;
  /** 96-byte raw Orchard FVK as hex (mode `orchardFvk`). */
  orchardFvk?: string;
}

export interface ZcashGetShieldedAddressParams extends PassphraseStateAware {
  /** Full 5-level transparent path `m/44'/133'/a'/0/i`; the Orchard path is derived from it. */
  path: string;
  showOnDevice?: boolean;
}

export interface ZcashShieldedAddress {
  /** Unified address with a single Orchard receiver. */
  address: string;
  path: string;
}
