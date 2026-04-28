/**
 * SDK-global event bus.
 *
 * All cross-runtime SDK events (logs today; firmware progress / battery
 * state / etc. tomorrow) flow through a single typed channel. Hosts
 * subscribe with `onSdkEvent(listener)` once and switch on `event.type`.
 *
 * Cross-process note: this bus is a per-runtime singleton. In MV3 extensions
 * where the SDK runs split between the service worker (adapter) and an
 * offscreen document (connector), each process must subscribe independently.
 * Typically the offscreen process forwards events over IPC to the service
 * worker so all events converge into one consumer pipeline.
 */

export type SdkLogEvent = {
  type: 'log';
  level: 'debug' | 'error';
  /** Pre-stringified payload. Hosts pass through to their logger as-is. */
  message: string;
};

/**
 * Discriminated union of all SDK-global events. Add new variants here when
 * extending — host adapters automatically see the new `type` and can dispatch
 * via the same `onSdkEvent` subscription instead of wiring a new IPC channel.
 */
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
      // Never let a misbehaving listener take down the SDK.
    }
  }
}

/**
 * SDK-internal: stringify args once and emit a log event. Caller can be
 * arbitrary internal code (chain handler, AppManager, errors helper) — no
 * connector instance required, so log events still flow even outside a
 * device call.
 */
export function emitLog(level: 'debug' | 'error', ...args: unknown[]): void {
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
