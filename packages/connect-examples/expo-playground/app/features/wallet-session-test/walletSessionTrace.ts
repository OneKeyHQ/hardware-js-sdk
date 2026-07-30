export type WalletSessionApiTrace = {
  method: string;
  arguments: unknown[];
  startedAt: string;
  durationMs: number;
  response?: unknown;
  error?: unknown;
};

const REDACTED_FIELDS: Record<string, string> = {
  entropy: 'entropy',
  mnemonic: 'mnemonic',
  passphrase: 'passphrase',
  password: 'password',
  pin: 'pin',
  privatekey: 'private-key',
  seed: 'seed',
  sessionid: 'wallet-session-id',
  xprv: 'xprv',
};

const normalizeFieldName = (key: string) => key.replace(/[_-]/g, '').toLowerCase();

function createTraceValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }
  if (ArrayBuffer.isView(value)) return `[BINARY:${value.byteLength}]`;
  if (value instanceof ArrayBuffer) return `[BINARY:${value.byteLength}]`;
  if (Array.isArray(value)) return value.map(item => createTraceValue(item, seen));
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';

  seen.add(value);
  const traceValue = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const redactedLabel = REDACTED_FIELDS[normalizeFieldName(key)];
      return [
        key,
        redactedLabel && item !== null && item !== undefined
          ? `[REDACTED:${redactedLabel}]`
          : createTraceValue(item, seen),
      ];
    })
  );
  seen.delete(value);
  return traceValue;
}

export function getWalletSessionTraceValue(value: unknown): unknown {
  return createTraceValue(value, new WeakSet());
}

const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

export function createWalletSessionTraceProxy<T extends object>(
  api: T,
  onTrace: (trace: WalletSessionApiTrace) => void
): T {
  return new Proxy(api, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof property !== 'string' || typeof value !== 'function') return value;

      return (...args: unknown[]) => {
        const startedAt = new Date().toISOString();
        const started = now();
        const baseTrace = () => ({
          method: property,
          arguments: getWalletSessionTraceValue(args) as unknown[],
          startedAt,
          durationMs: Math.max(0, Math.round(now() - started)),
        });

        try {
          const result = Reflect.apply(value, target, args) as unknown;
          if (
            result &&
            (typeof result === 'object' || typeof result === 'function') &&
            'then' in result &&
            typeof result.then === 'function'
          ) {
            return Promise.resolve(result).then(
              response => {
                onTrace({ ...baseTrace(), response: getWalletSessionTraceValue(response) });
                return response;
              },
              error => {
                onTrace({ ...baseTrace(), error: getWalletSessionTraceValue(error) });
                throw error;
              }
            );
          }
          onTrace({ ...baseTrace(), response: getWalletSessionTraceValue(result) });
          return result;
        } catch (error) {
          onTrace({ ...baseTrace(), error: getWalletSessionTraceValue(error) });
          throw error;
        }
      };
    },
  });
}
