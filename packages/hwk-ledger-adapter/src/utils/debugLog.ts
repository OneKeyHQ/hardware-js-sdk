/**
 * SDK-internal debug logger.
 *
 * Emits a `log` event onto the SDK-global event bus (`sdkEventBus`). Hosts
 * subscribe via `onSdkEvent(...)` and route to their own logging pipeline.
 * No subscribers = silent (and zero stringification cost).
 */
import { emitLog } from './sdkEventBus';

export function debugLog(...args: unknown[]): void {
  emitLog('debug', ...args);
}

export function debugError(...args: unknown[]): void {
  emitLog('error', ...args);
}
