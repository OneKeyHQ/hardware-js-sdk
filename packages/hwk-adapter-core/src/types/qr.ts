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
 * host can keep the first one it sees per path and refuse a later export that differs.
 */
export interface ExportedAccountKey {
  /** Account-level path the key was exported for, e.g. m/44'/60'/0'. */
  path: string;
  /** Extended public key, for curves derived on the host (secp256k1). */
  xpub?: string;
  /** Hex public key, for keys exported per path (Ed25519). */
  publicKey?: string;
}
