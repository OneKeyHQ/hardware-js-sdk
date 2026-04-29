/** SDK-internal log helpers. Emit through `sdkEventBus`; silent if nobody subscribes. */
import { emitLog } from './sdkEventBus';

export function debugLog(...args: unknown[]): void {
  emitLog('debug', ...args);
}

export function debugError(...args: unknown[]): void {
  emitLog('error', ...args);
}
