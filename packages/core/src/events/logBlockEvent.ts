import { UI_RESPONSE } from './ui-response';

export const LogBlockEvent: Set<string> = new Set([
  UI_RESPONSE.RECEIVE_PIN,
  UI_RESPONSE.RECEIVE_PASSPHRASE,
]);

const LogBlockMethod: Set<string> = new Set([
  'openWalletSession',
  'deviceUploadWallpaper',
  'uploadPortfolio',
  'fileWrite',
  'fileRead',
]);

const FieldRedactedMethod: Set<string> = new Set(['openWalletSession']);

const SensitiveLogKeys: Set<string> = new Set([
  'entropy',
  'mnemonic',
  'passphrase',
  'password',
  'pin',
  'privatekey',
  'seed',
  'sessionid',
  'xprv',
]);

const normalizeLogKey = (key: string) => key.replace(/[_-]/g, '').toLowerCase();

const isSigningMethod = (methodName: string) => /sign/i.test(methodName);

const redactLogValue = (value: unknown, seen: WeakSet<object>): unknown => {
  if (ArrayBuffer.isView(value)) {
    return `[BINARY:${value.byteLength}]`;
  }
  if (value instanceof ArrayBuffer) {
    return `[BINARY:${value.byteLength}]`;
  }
  if (Array.isArray(value)) {
    return value.map(item => redactLogValue(item, seen));
  }
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';

  seen.add(value);
  const redacted = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SensitiveLogKeys.has(normalizeLogKey(key)) && item !== null && item !== undefined
        ? '[REDACTED]'
        : redactLogValue(item, seen),
    ])
  );
  seen.delete(value);
  return redacted;
};

export function getLogBlockLabel(message: unknown): string | undefined {
  if (!message || typeof message !== 'object') return undefined;

  const { type, payload, method } = message as {
    type?: string;
    payload?: { method?: string };
    method?: string;
  };

  if (type && LogBlockEvent.has(type)) {
    return type;
  }

  const methodName = method ?? payload?.method;
  if (methodName && (LogBlockMethod.has(methodName) || isSigningMethod(methodName))) {
    return methodName;
  }

  return undefined;
}

export function getSafeLogPayload(value: unknown, blockLabel?: string): unknown {
  if (blockLabel && !FieldRedactedMethod.has(blockLabel)) {
    return { method: blockLabel, payload: '[REDACTED]' };
  }
  const redactedValue = redactLogValue(value, new WeakSet());
  if (
    blockLabel &&
    redactedValue &&
    typeof redactedValue === 'object' &&
    !Array.isArray(redactedValue)
  ) {
    return { ...redactedValue, method: blockLabel };
  }
  return redactedValue;
}

export function formatLogMethodLabel(label: string, methodName?: string): string {
  return methodName ? `${label} [${methodName}]` : label;
}
