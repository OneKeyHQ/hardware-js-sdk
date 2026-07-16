export type TrezorDebugLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type TrezorDebugLogEntry = {
  level: TrezorDebugLogLevel;
  scope: string;
  event: string;
  data?: Record<string, unknown>;
  thpModuleForwarded?: boolean;
};

export type TrezorDebugLogger = (entry: TrezorDebugLogEntry) => void;

const REDACTED_LOG_KEYS: ReadonlySet<string> = new Set([
  'credential',
  'credentials',
  'trezor_static_public_key',
  'host_static_key',
  'privateKey',
  'publicKey',
  'hostKey',
  'trezorKey',
  'encryptedPayload',
  'packetHex',
  'frameHeadHex',
  'pin',
  'passphrase',
  'stack',
  'sendNonce',
  'recvNonce',
  'device',
  'descriptors',
  'devices',
  'bytes',
  'bytesWritten',
  'chunkBytes',
  'chunkCount',
  'chunkIndex',
  'chunkSize',
  'endpoint',
  'firstChunkBytes',
  'messageBytes',
]);

const REDACTED_DATA_KEY_VALUES: ReadonlySet<string> = new Set([
  'credential',
  'credentials',
  'trezor_static_public_key',
  'host_static_key',
  'pin',
  'passphrase',
]);

const ALWAYS_KEPT_EVENT_PREFIXES = [
  'session.call.',
  'session.method.',
  'thp.call.',
  'core.call.',
  'core.send.',
  'connector.call.',
  'webusb.scan.filtered',
  'webusb.connector.enumerate.filtered',
  'ble.connector.enumerate.filtered',
  'capability.check',
];

const DROPPED_EVENT_PREFIXES = [
  'connector.search.',
  'webusb.scan.',
  'webusb.connector.enumerate.',
  'webusb.closeDevice.',
  'webusb.reset.',
  'ble.connector.enumerate.',
  'ble.renderer.scan.',
  'ble.main.scan.',
  'ble.scan.',
  'ble.write.',
  'ble.read.',
  'ble.notify.',
];

const DROPPED_EVENT_SUBSTRINGS = [
  'transferIn.',
  'transferOut.',
  '[TrezorCapabilityTrace]',
  '[TREZOR_VERIFY]',
  '.closeDevice.',
  '.reset.',
  '.write.',
  '.read.',
  '.notify.',
  '.data',
];

export function shouldLogTrezorDebugEntry(entry: TrezorDebugLogEntry): boolean {
  if (entry.level === 'warn' || entry.level === 'error') {
    return true;
  }

  if (entry.event === 'thp.loop') {
    return false;
  }

  if (ALWAYS_KEPT_EVENT_PREFIXES.some(prefix => entry.event.startsWith(prefix))) {
    return true;
  }

  if (DROPPED_EVENT_PREFIXES.some(prefix => entry.event.startsWith(prefix))) {
    return false;
  }

  if (DROPPED_EVENT_SUBSTRINGS.some(part => entry.event.includes(part))) {
    return false;
  }

  return true;
}

export function sanitizeTrezorDebugLogData(
  data?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!data) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = sanitizeTrezorDebugLogValue(key, value);
  }
  return sanitized;
}

function sanitizeTrezorDebugLogValue(key: string, value: unknown): unknown {
  if (REDACTED_LOG_KEYS.has(key)) return '[redacted]';
  if (Array.isArray(value)) {
    if (key === 'dataKeys' || key === 'messageKeys') {
      return value.filter(item => !REDACTED_DATA_KEY_VALUES.has(String(item)));
    }
    return value.map(item => sanitizeTrezorDebugLogValue(key, item));
  }
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[childKey] = sanitizeTrezorDebugLogValue(childKey, childValue);
    }
    return sanitized;
  }
  return value;
}

export function filterTrezorDebugLogEntry(
  entry: TrezorDebugLogEntry
): TrezorDebugLogEntry | undefined {
  if (!shouldLogTrezorDebugEntry(entry)) return undefined;
  return {
    ...entry,
    data: sanitizeTrezorDebugLogData(entry.data),
    thpModuleForwarded: shouldMarkThpModuleHandled(entry),
  };
}

function shouldMarkThpModuleHandled(entry: TrezorDebugLogEntry): boolean | undefined {
  if (entry.thpModuleForwarded) return true;
  if (entry.event === 'thp.loop') return undefined;
  if (entry.event.startsWith('thp.')) return true;
  if (entry.event === 'session.initialize.thp.fallback') return true;
  if (entry.event === 'session.initialize.done') {
    return entry.data?.protocol === 'thp' ? true : undefined;
  }
  if (entry.event.startsWith('session.method.')) {
    return entry.data?.protocol === 'thp' ? true : undefined;
  }
  return undefined;
}
