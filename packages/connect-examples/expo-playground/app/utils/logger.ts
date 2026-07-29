import { useDeviceStore } from '../store/deviceStore';
import type { UnifiedLogEntry, LogType } from '../components/common/UnifiedLogger';

export type logData = Record<string, unknown> | undefined;

// Create a unified log entry
export function createUnifiedLogEntry(
  type: LogType,
  message: string,
  data?: logData
): UnifiedLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type,
    title: message,
    message,
    content: data || null,
    data,
  };
}

// Log information
export function logInfo(message: string, data?: logData) {
  console.info(`[INFO] ${message}`, data || '');
  // Only add to store if in browser environment
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('info', message, data));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log errors
export function logError(message: string, data?: logData) {
  console.error(`[ERROR] ${message}`, data || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('error', message, data));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log requests
export function logRequest(message: string, data?: logData) {
  console.info(`[REQUEST] ${message}`, data || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('request', message, data));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log responses
export function logResponse(message: string, data?: logData) {
  console.info(`[RESPONSE] ${message}`, data || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('response', message, data));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}

// Log hardware-level details (e.g., final params to device)
export function logHardware(message: string, data?: logData) {
  console.info(`[HARDWARE] ${message}`, data || '');
  try {
    const store = useDeviceStore.getState();
    store.addLog(createUnifiedLogEntry('hardware', message, data));
  } catch (e) {
    console.error('Failed to add log to store:', e);
  }
}
