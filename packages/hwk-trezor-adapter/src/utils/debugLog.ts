import { emitLog } from './sdkEventBus';

export function debugLog(...args: unknown[]): void {
  emitLog('debug', ...args);
}

export function debugError(...args: unknown[]): void {
  emitLog('error', ...args);
}
