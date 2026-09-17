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
 *
 * The list is deliberately narrow: only real secrets and key material. A BLE
 * transport bug is diagnosed from frames, sizes, states and stacks, so
 * redacting those would trade a leak we do not have for a repro we cannot do.
 * Raw frames (`packetHex`, `hexData`, `payload`) stay: on this handler they
 * are Trezor THP ciphertext or Ledger APDUs, and neither carries a PIN,
 * passphrase or seed — those never leave the device. Add a cleartext protocol
 * here and they move into the redact list.
 */
const REDACTED_KEYS: ReadonlySet<string> = new Set([
  // Secrets the user types or the device derives.
  'pin',
  'passphrase',
  'mnemonic',
  'seed',
  'seedPhrase',
  'entropy',
  // Private key material. Public keys stay: device identity, address
  // derivation and fingerprint mismatches are all diagnosed from them.
  'privateKey',
  'privKey',
  'secretKey',
  'hostKey',
  'trezorKey',
  'host_static_key',
  // Pairing / session credentials. The THP static key pair is part of the
  // pairing credential, so it goes here rather than with the public keys.
  'trezor_static_public_key',
  'credential',
  'credentials',
  'sessionKey',
  'token',
  'accessToken',
  'authToken',
]);

/** Guards against a cyclic or pathological `data` bag stalling the log call. */
const MAX_REDACT_DEPTH = 8;

/**
 * Keep the shape of what was dropped so two logs still line up: a 32-byte
 * value that became 33 bytes is visible without the value itself.
 */
function describeRedacted(value: unknown): string {
  if (typeof value === 'string') return `<redacted ${value.length} chars>`;
  if (ArrayBuffer.isView(value)) return `<redacted ${value.byteLength} bytes>`;
  if (Array.isArray(value)) return `<redacted ${value.length} items>`;
  return '<redacted>';
}

function redactValue(key: string, value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (REDACTED_KEYS.has(key)) return describeRedacted(value);
  if (!value || typeof value !== 'object') return value;
  // Errors carry message/stack non-enumerably; recursing would empty them.
  // Typed arrays would turn into index-keyed objects. Both are forwarded whole.
  if (value instanceof Error || ArrayBuffer.isView(value)) return value;
  if (depth >= MAX_REDACT_DEPTH) return '<redacted depth limit>';
  if (seen.has(value)) return '<circular>';
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map(item => redactValue(key, item, depth + 1, seen));
  }
  const out: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
    out[childKey] = redactValue(childKey, childValue, depth + 1, seen);
  }
  return out;
}

/** Replace sensitive values at any depth; everything else is forwarded verbatim. */
export function redactBleDebugLogData(
  data?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const seen = new WeakSet<object>();
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = redactValue(key, value, 0, seen);
  }
  return out;
}
