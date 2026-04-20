/**
 * Strip the "m/" prefix from BIP-44 derivation paths.
 * Ledger DMK requires paths without the "m/" prefix.
 */
export function normalizePath(path: string): string {
  return path.startsWith('m/') ? path.slice(2) : path;
}
