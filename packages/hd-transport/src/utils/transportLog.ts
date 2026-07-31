import type { ProtocolType } from '../types';

const REDACTED = '[REDACTED]';

const SENSITIVE_LOG_KEYS = new Set([
  'accesstoken',
  'address',
  'apikey',
  'connectid',
  'devicestate',
  'deviceid',
  'entropy',
  'expectedpassphrasestate',
  'mnemonic',
  'passphrase',
  'passphrasestate',
  'password',
  'pin',
  'privatekey',
  'publickey',
  'seed',
  'serialnumber',
  'session',
  'sessionid',
  'signature',
  'token',
  'uuid',
  'walletsessionid',
  'xprv',
  'xpub',
]);

const normalizeLogKey = (key: string) => key.replace(/[_-]/g, '').toLowerCase();

const isSensitiveLogKey = (key: string) => {
  const normalizedKey = normalizeLogKey(key);
  return (
    SENSITIVE_LOG_KEYS.has(normalizedKey) ||
    normalizedKey.endsWith('address') ||
    normalizedKey.endsWith('privatekey') ||
    normalizedKey.endsWith('publickey') ||
    normalizedKey.endsWith('signature')
  );
};

const isSigningMessage = (messageName?: string) =>
  Boolean(messageName && /(?:sign|txack|transaction)/i.test(messageName));

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
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return '[CIRCULAR]';
  }

  seen.add(value);
  const redacted = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      isSensitiveLogKey(key) && item !== null && item !== undefined
        ? REDACTED
        : redactLogValue(item, seen),
    ])
  );
  seen.delete(value);
  return redacted;
};

export function getSafeTransportLogPayload(value: unknown, messageName?: string): unknown {
  if (isSigningMessage(messageName)) {
    return REDACTED;
  }
  return redactLogValue(value, new WeakSet());
}

export function createTransportCallLog(
  name: string,
  protocol: ProtocolType,
  data: Record<string, unknown>
) {
  return {
    name,
    protocol,
    request: getSafeTransportLogPayload(data, name),
  };
}

const HIGH_VOLUME_CALLS = new Set(['FileWrite', 'FilesystemFileWrite', 'EmmcFileWrite']);

export function shouldSuppressHighVolumeCallLog(name: string) {
  return HIGH_VOLUME_CALLS.has(name);
}
