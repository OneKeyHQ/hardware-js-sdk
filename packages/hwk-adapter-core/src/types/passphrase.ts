/**
 * Mixin for chain-operation params that can be pinned to a specific passphrase
 * wallet.
 *
 * Trezor-only. `passphraseState` is the wallet identity returned by
 * `getPassphraseState`: today this is the compressed public key derived at
 * `m/44'/0'/0'`, not the 4-byte master fingerprint. When present, the adapter
 * creates a fresh wallet session (THP application session, or v1 device
 * session) and verifies the derived state before issuing the call, so the
 * address/signature comes from the intended passphrase wallet.
 *
 * Ledger has no equivalent and ignores the field — it never reaches the
 * protobuf layer (the adapter strips it before forwarding to the connector).
 */
export interface PassphraseStateAware {
  passphraseState?: string;
}
