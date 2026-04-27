/**
 * SDK-internal logger sink.
 *
 * Off by default. The host app injects a sink via `setLogger(fn)` so debug
 * output flows into the host's logging pipeline (e.g. defaultLogger).
 *
 * Cross-process note: this module holds a per-runtime singleton. In MV3
 * extensions where the SDK runs split between the service worker (adapter)
 * and an offscreen document (connector), each process must call
 * `setLogger(...)` independently — they don't share state.
 */

export type LogLevel = 'debug' | 'error';
export type Logger = (level: LogLevel, ...args: unknown[]) => void;

let logger: Logger | null = null;

/**
 * Inject a logger sink. Pass `null` to silence the SDK.
 * Each process / runtime needs its own call (module state is not shared
 * across MV3 SW ↔ offscreen).
 */
export function setLogger(fn: Logger | null): void {
  logger = fn;
}

export function debugLog(...args: unknown[]): void {
  logger?.('debug', ...args);
}

export function debugError(...args: unknown[]): void {
  logger?.('error', ...args);
}
