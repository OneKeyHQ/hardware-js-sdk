import type { BtcScriptType } from '../urEngine/types';

/** Always returns an `m/`-prefixed path, regardless of the input's casing/prefix. */
export function normalizePath(path: string): string {
  const trimmed = path.trim();
  return /^m\//i.test(trimmed) ? `m/${trimmed.slice(2)}` : `m/${trimmed}`;
}

const BIP32_HARDENED_OFFSET = 0x80000000;

/**
 * A `m/`-prefixed path whose every segment is a decimal index below 2^31 with an optional `'`.
 * Request encoders read `44h` as the unhardened 44 and `0x1` as 0, which would sign with
 * another path's key.
 */
export function isBip32Path(path: string): boolean {
  const segments = normalizePath(path).slice(2).split('/');
  return segments.every(segment => {
    const match = /^(\d+)'?$/.exec(segment);
    return match !== null && Number(match[1]) < BIP32_HARDENED_OFFSET;
  });
}

/**
 * Splits a 5-segment BIP-44 leaf path into the 3-segment account path and the relative
 * `change/index`; a path of 3 or fewer segments is already an account path.
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

/** BIP-44/49/84/86 purpose to script type; undefined for any other purpose. */
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
 * Firmware signs BTC only against account-0 xpubs (gui_btc.c PreparePublicKeys). Testnet is
 * excluded because addresses are derived with mainnet parameters.
 */
export function isKeystoneSignableBtcAccountPath(accountPath: string): boolean {
  const segments = normalizePath(accountPath).slice(2).split('/');
  if (segments.length !== 3) return false;
  const [purpose, coin, account] = segments;
  return ["44'", "49'", "84'", "86'"].includes(purpose) && coin === "0'" && account === "0'";
}

export const KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE =
  "Keystone BTC is limited to mainnet account 0 (m/44'|49'|84'|86'/0'/0')";
