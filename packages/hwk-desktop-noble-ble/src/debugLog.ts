export type BleDebugLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type BleDebugLogEntry = {
  level: BleDebugLogLevel;
  scope: string;
  event: string;
  data?: Record<string, unknown>;
};

export type BleDebugLogger = (entry: BleDebugLogEntry) => void;

/**
 * Keys whose values never belong in a log. This handler only ever sees
 * transport-level data — device ids, names, counts — but a caller can pass an
 * arbitrary `data` bag, and a raw frame or a pairing secret reaching an
 * on-disk log is not something to leave to caller discipline.
 */
const REDACTED_KEYS: ReadonlySet<string> = new Set([
  'credential',
  'credentials',
  'privateKey',
  'publicKey',
  'hostKey',
  'pin',
  'passphrase',
  'hexData',
  'payload',
  'bytes',
]);

/** Replace sensitive values in place; everything else is forwarded verbatim. */
export function redactBleDebugLogData(
  data?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = REDACTED_KEYS.has(key) ? '[redacted]' : value;
  }
  return out;
}
