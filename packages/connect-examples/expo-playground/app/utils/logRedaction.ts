const SENSITIVE_LOG_KEY =
  /mnemonic|seed|private.?key|xprv|pin|passphrase|session.?id|transaction|tx.?data|binary|package.?bytes|raw/i;

export const redactSensitiveLogValue = (
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown => {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  if (depth >= 5) return '[Truncated]';
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (value instanceof ArrayBuffer) return `[ArrayBuffer ${value.byteLength} bytes]`;
  if (ArrayBuffer.isView(value)) return `[Binary ${value.byteLength} bytes]`;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return `[Blob ${value.size} bytes]`;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(item => redactSensitiveLogValue(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      SENSITIVE_LOG_KEY.test(key)
        ? '[Redacted]'
        : redactSensitiveLogValue(entryValue, depth + 1, seen),
    ])
  );
};
