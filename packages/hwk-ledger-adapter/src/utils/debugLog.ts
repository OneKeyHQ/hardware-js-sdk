/**
 * Centralised debug logger for the Ledger adapter.
 *
 * Replaces scattered `console.log('[DMK] ...')` / `console.log('[LedgerAdapter] ...')`
 * calls. Off by default; flip `DEBUG` manually during local debugging, or gate
 * it on a build-time env var in consumers.
 */
const DEBUG = false;

export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
}

export function debugError(...args: unknown[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}
