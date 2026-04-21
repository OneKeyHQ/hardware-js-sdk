/**
 * Centralised debug logger for the Ledger adapter.
 *
 * Off by default. Toggle programmatically via `setDebugEnabled(true)`.
 */

let enabled = false;

/** Enable or disable debug logging at runtime. */
export function setDebugEnabled(value: boolean): void {
  enabled = value;
}

/** Returns the current debug-enabled state. */
export function isDebugEnabled(): boolean {
  return enabled;
}

export function debugLog(...args: unknown[]): void {
  if (enabled) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
}

export function debugError(...args: unknown[]): void {
  if (enabled) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}
