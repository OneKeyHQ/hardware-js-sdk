export interface QrDisplayData {
  urType: string;
  urData: string;
  animated: boolean;
}

export interface QrResponseData {
  urType: string;
  urData: string;
}

/**
 * The account-level key an address was derived from. Air-gapped exports are not signed, so a
 * host can keep the first one it sees per path and refuse a later export that differs. Compare
 * `publicKey` and `chainCode`: the xpub string also carries encoding fields that may differ.
 */
export interface ExportedAccountKey {
  /** Account-level path the key was exported for, e.g. m/44'/60'/0'. */
  path: string;
  /** Hex public key. */
  publicKey: string;
  /** Hex BIP-32 chain code, for keys the host derives children from (secp256k1). */
  chainCode?: string;
  /** Extended public key the address was derived from, when there is one. */
  xpub?: string;
}
