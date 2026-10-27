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

// All-network results of these networks carry what their own address methods
// keep out of logs (viewing keys, private addresses).
const LogPayloadBlockNetwork: Set<string> = new Set(['zcash', 'xmr']);

type AllNetworkLogItem = { network?: string; success?: boolean; payload?: object | string } | null;

// A call response lists the results in `payload`; a loop callback carries one
// result, or all of them when finished, in `payload.data`.
type AllNetworkLogMessage = {
  payload?: AllNetworkLogItem[] | { data?: AllNetworkLogItem | AllNetworkLogItem[] };
};

function redactAllNetworkItem(item: AllNetworkLogItem): AllNetworkLogItem {
  if (!item || item.success === false || item.payload === undefined) return item;
  return item.network && LogPayloadBlockNetwork.has(item.network)
    ? { ...item, payload: '[REDACTED]' }
    : item;
}

function redactAllNetworkItems(items: AllNetworkLogItem[]) {
  const redacted = items.map(redactAllNetworkItem);
  return redacted.some((item, index) => item !== items[index]) ? redacted : items;
}

// Returns `message` itself when nothing needs redacting.
function redactAllNetworkResults(message: AllNetworkLogMessage): AllNetworkLogMessage {
  const { payload } = message;
  if (Array.isArray(payload)) {
    const items = redactAllNetworkItems(payload);
    return items === payload ? message : { ...message, payload: items };
  }
  const data = payload?.data;
  if (!data) return message;
  const redacted = Array.isArray(data) ? redactAllNetworkItems(data) : redactAllNetworkItem(data);
  return redacted === data ? message : { ...message, payload: { ...payload, data: redacted } };
}

export function getSafeLogPayload(value: unknown, blockLabel?: string): unknown {
  if (blockLabel) {
    return { method: blockLabel, payload: '[REDACTED]' };
  }
  if (!value || typeof value !== 'object') return value;
  return redactAllNetworkResults(value as AllNetworkLogMessage);
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
