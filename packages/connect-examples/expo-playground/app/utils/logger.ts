import { useDeviceStore } from '../store/deviceStore';
import type { UnifiedLogEntry, LogType } from '../components/common/UnifiedLogger';
import { summarizeJsonValue } from './jsonPreview';

export type logData = Record<string, unknown> | undefined;

type LogOptions = {
  console?: boolean;
  persist?: boolean;
  store?: boolean;
};

const SENSITIVE_LOG_KEYS = new Set([
  'mnemonic',
  'passphrase',
  'passphrasestate',
  'password',
  'pin',
  'privatekey',
  'seed',
]);

function redactSensitiveLogValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => redactSensitiveLogValue(item));
  }

  if (!value || typeof value !== 'object') return value;

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const normalizedKey = key.replace(/[_-]/g, '').toLowerCase();
      return [
        key,
        SENSITIVE_LOG_KEYS.has(normalizedKey) ? '[REDACTED]' : redactSensitiveLogValue(item),
      ];
    })
  );
}

function getSafeLogData(data?: logData): logData {
  if (!data) return data;

  const summarized = summarizeJsonValue(redactSensitiveLogValue(data), {
    maxDepth: 6,
    maxArrayItems: 20,
    maxObjectKeys: 50,
    maxStringLength: 512,
  });

  if (summarized && typeof summarized === 'object' && !Array.isArray(summarized)) {
    return summarized as Record<string, unknown>;
  }

  return { value: summarized };
}

// Create a unified log entry
export function createUnifiedLogEntry(
  type: LogType,
  message: string,
  data?: logData,
  options: { transient?: boolean } = {}
): UnifiedLogEntry {
  const safeData = getSafeLogData(data);
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type,
    title: message,
    message,
    content: safeData || null,
    data: safeData,
    ...(options.transient ? { transient: true } : {}),
  };
}

// Log information
export function logInfo(message: string, data?: logData) {
  const safeData = getSafeLogData(data);
  console.info(`[INFO] ${message}`, safeData || '');
  // Only add to store if in browser environment
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('info', message, safeData));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log errors
export function logError(message: string, data?: logData) {
  const safeData = getSafeLogData(data);
  console.error(`[ERROR] ${message}`, safeData || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('error', message, safeData));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log requests
export function logRequest(message: string, data?: logData) {
  const safeData = getSafeLogData(data);
  console.info(`[REQUEST] ${message}`, safeData || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('request', message, safeData));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log responses
export function logResponse(message: string, data?: logData) {
  const safeData = getSafeLogData(data);
  console.info(`[RESPONSE] ${message}`, safeData || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('response', message, safeData));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log hardware-level details (e.g., final params to device)
export function logHardware(message: string, data?: logData, options: LogOptions = {}) {
  const { console: shouldWriteConsole = true, persist = true, store = true } = options;
  const safeData = getSafeLogData(data);
  if (shouldWriteConsole) {
    console.info(`[HARDWARE] ${message}`, safeData || '');
  }
  if (!store) return;
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('hardware', message, safeData, { transient: !persist }));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}
