import type { TronSignType } from './TronSignRequest';

/**
 * `urData` is the hex-encoded raw CBOR payload, not a `ur:` string or QR frame list; the UI layer
 * owns fragmenting into animated QR frames.
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
  /** BIP32 master fingerprint of the seed (lowercase hex, 8 chars) used as BC-UR xfp metadata. */
  masterFingerprint: string;
  /** Model string (e.g. "Keystone 3 Pro"), present on both channels but not unique per unit. */
  device?: string;
  /**
   * sha256(sha256(serial)), only sent by some QR sync menus and never on the KeyDerivation path.
   * Enrichment only; never key identity on it.
   */
  deviceId?: string;
  deviceVersion?: string;
  accounts: KeystoneParsedAccount[];
}

export interface KeystoneEthSignRequestInput {
  requestId: string;
  /** Hex, no 0x prefix, raw unsigned payload matching dataType. */
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

/** Script types for purposes 44'/49'/84'/86'; `p2tr` address derivation is not supported yet. */
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

/** SLIP-10 secp256k1 (EVM/BTC) and ed25519 (SOL); Cardano BIP32-Ed25519 is out of scope. */
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
   * Hex, no 0x prefix: protobuf `Transaction.raw` bytes, or raw message bytes (the device applies
   * the TIP-191 prefix itself).
   */
  rawTxHex: string;
  path: string;
  xfp: string;
  origin?: string;
  /** Defaults to Transaction. */
  signType?: TronSignType;
}

export interface KeystoneTronSignatureResult {
  requestId?: string;
  /** Hex, no 0x prefix, 65-byte secp256k1 signature. */
  signature: string;
}
