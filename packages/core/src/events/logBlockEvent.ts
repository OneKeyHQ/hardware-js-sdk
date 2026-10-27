import { UI_REQUEST } from './ui-request';
import { UI_RESPONSE } from './ui-response';

export const LogBlockEvent: Set<string> = new Set([
  UI_REQUEST.REQUEST_PASSPHRASE,
  UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE,
  UI_RESPONSE.RECEIVE_PIN,
  UI_RESPONSE.RECEIVE_PASSPHRASE,
]);

// Drop sensitive wallet payloads and large resource data before logger caches
// or log events can retain them, regardless of whether debug output is enabled.
const LogPayloadBlockMethod: Set<string> = new Set([
  'btcDeriveContextHash',
  'deviceUploadNft',
  'deviceUploadWallpaper',
  'uploadPortfolio',
  'fileWrite',
  'fileRead',
  'zcashGetAddress',
  'zcashSignPczt',
  'moneroGetAddress',
  'moneroGetWatchKey',
  'moneroKeyImageSync',
]);

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
  if (methodName && LogPayloadBlockMethod.has(methodName)) {
    return methodName;
  }

  return undefined;
}

export function getSafeLogPayload(value: unknown, blockLabel?: string): unknown {
  if (blockLabel) {
    return { method: blockLabel, payload: '[REDACTED]' };
  }
  return value;
}

// A queued task holds its method's raw payload; redact it like the call.
export function getSafeLogTask<T extends { id?: number; method?: { payload?: unknown } }>(
  task: T | undefined
): T | { id?: number; method: string; payload: string } | undefined {
  const blockLabel = getLogBlockLabel(task?.method?.payload);
  return blockLabel ? { id: task?.id, method: blockLabel, payload: '[REDACTED]' } : task;
}

export function formatLogMethodLabel(label: string, methodName?: string): string {
  return methodName ? `${label} [${methodName}]` : label;
}
