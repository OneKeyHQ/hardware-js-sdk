/**
 * A UR payload in the wire shape the reserved `QrDisplayData`/`QrResponseData`
 * (from `@onekeyfe/hwk-adapter-core`) already commit to: `urType` + `urData`.
 *
 * `urData` is the hex-encoded raw CBOR payload (equivalent to `ur.cbor.toString('hex')`),
 * NOT a `ur:type/…` bech32-style string and NOT a pre-fragmented animated-QR frame
 * list. Turning this into single- or multi-part QR frames is a rendering concern the
 * app/UI layer owns (via `@ngraveio/bc-ur`'s `UREncoder`), not something the engine
 * or the event payload should bake in — `QrDisplayData.animated` is only a hint that
 * the payload is large enough to need fragmenting.
 */
export interface KeystoneUr {
  urType: string;
  urData: string;
}

export interface KeystoneParsedAccount {
  chain: string;
  path: string;
  publicKey: string;
  extendedPublicKey?: string;
  /** Per-key source fingerprint, hex. Usually equals the account's masterFingerprint. */
  xfp?: string;
  name?: string;
}

export interface KeystoneParsedMultiAccounts {
  /** BIP32 master fingerprint of the seed (lowercase hex, 8 chars) — the cross-channel wallet identity. */
  masterFingerprint: string;
  /** Model string (e.g. "Keystone 3 Pro"), present on both channels but not unique per unit. */
  device?: string;
  /**
   * Hardware-derived id (sha256(sha256(serial))). Only populated in specific
   * wallet-branded QR sync menus — firmware omits it on the generic
   * KeyDerivation path USB uses. Enrichment only; never key identity on it.
   */
  deviceId?: string;
  deviceVersion?: string;
  accounts: KeystoneParsedAccount[];
}

export interface KeystoneEthSignRequestInput {
  requestId: string;
  /** Hex, no 0x prefix — raw unsigned payload matching dataType. */
  unsignedTxHex: string;
  dataType: 'transaction' | 'typedTransaction' | 'personalMessage' | 'typedData';
  path: string;
  xfp: string;
  chainId?: number;
  address?: string;
  origin?: string;
}

export interface KeystoneEthSignatureResult {
  requestId?: string;
  r: string;
  s: string;
  /** Hex, no 0x prefix. Legacy tx: recovery id/27-28 form. EIP-1559/2930: 0/1 parity. */
  v: string;
}

export interface KeystoneBtcSignRequestAccount {
  path: string;
  xfp: string;
  address?: string;
}

/**
 * Standard BIP-44/49/84/86 purpose → script-type mapping. `p2tr` is a
 * recognized value but `KeystoneUrEngine.deriveBtcAddressFromXpub` doesn't
 * support it yet — taproot output-key tweaking needs an elliptic-curve
 * library (`bitcoinjs-lib`'s `initEccLib`) this package doesn't wire in.
 */
export type BtcScriptType = 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh' | 'p2tr';

export interface KeystoneSolSignRequestInput {
  requestId: string;
  /** Hex, no 0x prefix. */
  unsignedPayloadHex: string;
  dataType: 'transaction' | 'message';
  path: string;
  xfp: string;
  address?: string;
  origin?: string;
}

export interface KeystoneSolSignatureResult {
  requestId?: string;
  /** Hex, no 0x prefix. */
  signature: string;
}

export interface KeystoneBtcSignatureResult {
  requestId: string;
  publicKey: string;
  /** Hex, no 0x prefix. */
  signature: string;
}

/** SLIP-10 for secp256k1 (EVM/BTC) and ed25519 (SOL); Cardano-style BIP32-Ed25519 is out of scope. */
export type KeystoneDerivationCurve = 'secp256k1' | 'ed25519';

export interface KeystoneKeySchema {
  path: string;
  curve?: KeystoneDerivationCurve;
}

export interface KeystoneKeyDerivationRequestInput {
  schemas: KeystoneKeySchema[];
  origin?: string;
}

export interface KeystoneTronSignRequestInput {
  requestId: string;
  /**
   * Hex, no 0x prefix — a standard TRON protobuf `Transaction.raw` message
   * (the same bytes `TronSignTxParams.rawTxHex` already carries for Ledger).
   */
  rawTxHex: string;
  path: string;
  xfp: string;
  origin?: string;
}

export interface KeystoneTronSignatureResult {
  requestId?: string;
  /** Hex, no 0x prefix — 65-byte secp256k1 signature. */
  signature: string;
}
