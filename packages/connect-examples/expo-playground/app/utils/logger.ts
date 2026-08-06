import { useDeviceStore } from '../store/deviceStore';
import type { UnifiedLogEntry, LogType } from '../components/common/UnifiedLogger';
import { redactSensitiveLogValue } from './logRedaction';

export type logData = Record<string, unknown> | undefined;

const sanitizeLogData = (data?: logData): logData =>
  data ? (redactSensitiveLogValue(data) as Record<string, unknown>) : undefined;

export { redactSensitiveLogValue } from './logRedaction';

// Create a unified log entry
export function createUnifiedLogEntry(
  type: LogType,
  message: string,
  data?: logData
): UnifiedLogEntry {
  const sanitizedData = sanitizeLogData(data);
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type,
    title: message,
    message,
    content: sanitizedData || null,
    data: sanitizedData,
  };
}

// Log information
export function logInfo(message: string, data?: logData) {
  const sanitizedData = sanitizeLogData(data);
  console.info(`[INFO] ${message}`, sanitizedData || '');
  // Only add to store if in browser environment
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('info', message, sanitizedData));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log errors
export function logError(message: string, data?: logData) {
  const sanitizedData = sanitizeLogData(data);
  console.error(`[ERROR] ${message}`, sanitizedData || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('error', message, sanitizedData));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log requests
export function logRequest(message: string, data?: logData) {
  const sanitizedData = sanitizeLogData(data);
  console.info(`[REQUEST] ${message}`, sanitizedData || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('request', message, sanitizedData));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log responses
export function logResponse(message: string, data?: logData) {
  const sanitizedData = sanitizeLogData(data);
  console.info(`[RESPONSE] ${message}`, sanitizedData || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('response', message, sanitizedData));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log hardware-level details (e.g., final params to device)
export function logHardware(message: string, data?: logData) {
  const sanitizedData = sanitizeLogData(data);
  console.info(`[HARDWARE] ${message}`, sanitizedData || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('hardware', message, sanitizedData));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}
