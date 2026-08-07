/**
 * SDK-global event bus. Per-runtime singleton; hosts forward events over their
 * own IPC when the adapter runs in an offscreen/background split.
 */

export type SdkLogEvent = {
  type: 'log';
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Pre-stringified payload. */
  message: string;
};

export type SdkEvent = SdkLogEvent;

export type SdkEventListener = (event: SdkEvent) => void;

const listeners = new Set<SdkEventListener>();

export function onSdkEvent(listener: SdkEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function offSdkEvent(listener: SdkEventListener): void {
  listeners.delete(listener);
}

export function emitSdkEvent(event: SdkEvent): void {
  if (listeners.size === 0) return;
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Logging subscribers must not affect SDK execution.
    }
  }
}

export function emitLog(level: SdkLogEvent['level'], ...args: unknown[]): void {
  if (listeners.size === 0) return;
  const message = args.map(a => (typeof a === 'string' ? a : safeStringify(a))).join(' ');
  emitSdkEvent({ type: 'log', level, message });
}

function safeStringify(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ? `${value.message}\n${value.stack}` : value.message;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
