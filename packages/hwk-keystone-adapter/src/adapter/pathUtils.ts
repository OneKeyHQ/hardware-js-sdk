import type { BtcScriptType } from '../urEngine/types';

/** Always returns an `m/`-prefixed path, regardless of the input's casing/prefix. */
export function normalizePath(path: string): string {
  const trimmed = path.trim();
  return /^m\//i.test(trimmed) ? `m/${trimmed.slice(2)}` : `m/${trimmed}`;
}

/**
 * Split a full BIP-44 leaf path (`purpose'/coin'/account'/change/index`, 5
 * segments) into its 3-segment account path and the relative `change/index`
 * path from that account to the leaf. Matches the OneKey Keystone air-gap
 * demo's `removePathLastSegment({removeCount: 2})` convention, which is
 * verified against real Keystone hardware.
 *
 * A path with 3 or fewer segments IS already an account path (or shorter) —
 * BIP-44's account level is exactly 3 hardened components — so there is
 * nothing to split off: `relativeDerivePath` is empty and `accountPath` is
 * the (normalized) input unchanged.
 */
export function splitAccountPath(path: string): {
  accountPath: string;
  relativeDerivePath: string;
} {
  const normalized = normalizePath(path);
  const segments = normalized.slice(2).split('/');
  if (segments.length <= 3) {
    return { accountPath: normalized, relativeDerivePath: '' };
  }
  const accountSegments = segments.slice(0, segments.length - 2);
  const relativeSegments = segments.slice(segments.length - 2);
  return {
    accountPath: `m/${accountSegments.join('/')}`,
    relativeDerivePath: relativeSegments.join('/'),
  };
}

/**
 * Standard BIP-44/49/84/86 purpose → script-type mapping. Returns `undefined`
 * for a path whose purpose isn't one of these four (or isn't parseable),
 * rather than guessing.
 */
export function btcScriptTypeFromPath(path: string): BtcScriptType | undefined {
  const match = normalizePath(path).match(/^m\/(\d+)'/);
  if (!match) return undefined;
  switch (Number(match[1])) {
    case 44:
      return 'p2pkh';
    case 49:
      return 'p2sh-p2wpkh';
    case 84:
      return 'p2wpkh';
    case 86:
      return 'p2tr';
    default:
      return undefined;
  }
}

/**
 * Keystone firmware signs BTC only against account-0 xpubs (gui_btc.c
 * PreparePublicKeys). Testnet (coin 1') is excluded on top of that: this
 * package derives every BTC address with mainnet parameters, so admitting a
 * testnet path would hand back a mainnet address for a testnet account.
 */
export function isKeystoneSignableBtcAccountPath(accountPath: string): boolean {
  const segments = normalizePath(accountPath).slice(2).split('/');
  if (segments.length !== 3) return false;
  const [purpose, coin, account] = segments;
  return ["44'", "49'", "84'", "86'"].includes(purpose) && coin === "0'" && account === "0'";
}

export const KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE =
  "Keystone BTC is limited to mainnet account 0 (m/44'|49'|84'|86'/0'/0')";
