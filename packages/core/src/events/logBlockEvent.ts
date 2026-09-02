import { UI_REQUEST } from './ui-request';
import { UI_RESPONSE } from './ui-response';

export const LogBlockEvent: Set<string> = new Set([
  UI_REQUEST.REQUEST_PASSPHRASE,
  UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE,
  UI_RESPONSE.RECEIVE_PIN,
  UI_RESPONSE.RECEIVE_PASSPHRASE,
]);

const LogLabelMethod: Set<string> = new Set([
  'openWalletSession',
  'deviceUploadNft',
  'deviceUploadWallpaper',
  'uploadPortfolio',
  'fileWrite',
  'fileRead',
]);

// 资源上传参数可能包含很大的 Base64 字符串。这里按方法整段跳过，避免日志层
// 递归复制和序列化这些数据；资源 API 与传输内容本身保持不变。
const LogPayloadBlockMethod: Set<string> = new Set([
  'deviceUploadNft',
  'deviceUploadWallpaper',
  'uploadPortfolio',
]);

const SensitiveLogKeys: Set<string> = new Set([
  'devicestate',
  'entropy',
  'expectedpassphrasestate',
  'mnemonic',
  'passphrase',
  'passphrasestate',
  'password',
  'pin',
  'privatekey',
  'seed',
  'session',
  'sessionid',
  'walletsessionid',
  'xprv',
]);

// Debug signing logs intentionally expose transaction and message data for QA.
// These red-line secrets remain blocked even when SDK debug logging is enabled.
const CriticalSensitiveLogKeys: Set<string> = new Set([
  'accesstoken',
  'apikey',
  'authtoken',
  'bearertoken',
  'credential',
  'credentials',
  'entropy',
  'mnemonic',
  'mnemonics',
  'passphrase',
  'password',
  'pin',
  'privatekey',
  'refreshtoken',
  'secret',
  'seed',
  'session',
  'token',
  'word',
  'words',
  'xprv',
]);

const DebugVisibleLogKeys: Set<string> = new Set([
  'expectedpassphrasestate',
  'initsession',
  'keepsession',
  'passphrasestate',
  'useemptypassphrase',
]);

const normalizeLogKey = (key: string) => key.replace(/[_-]/g, '').toLowerCase();

const isSigningMethod = (methodName: string) => /sign/i.test(methodName);

const isSensitiveLogKey = (key: string) => SensitiveLogKeys.has(normalizeLogKey(key));

const isCriticalSensitiveLogKey = (key: string) => {
  const normalizedKey = normalizeLogKey(key);
  if (DebugVisibleLogKeys.has(normalizedKey)) return false;
  return (
    CriticalSensitiveLogKeys.has(normalizedKey) ||
    normalizedKey.includes('privatekey') ||
    normalizedKey.includes('mnemonic') ||
    normalizedKey.includes('password') ||
    normalizedKey.includes('seed') ||
    normalizedKey.includes('secret') ||
    normalizedKey.includes('xprv') ||
    normalizedKey.includes('entropy') ||
    normalizedKey.includes('credential') ||
    normalizedKey.endsWith('passphrase') ||
    normalizedKey.endsWith('pin') ||
    normalizedKey.endsWith('token') ||
    normalizedKey.endsWith('apikey') ||
    normalizedKey.endsWith('word') ||
    normalizedKey.endsWith('words')
  );
};

const getSigningResponseLogSummary = (
  value: unknown,
  method: string
): Record<string, unknown> | undefined => {
  const response = value as {
    success?: unknown;
    payload?: { code?: unknown; error?: unknown } | null;
  };
  if (typeof response?.success !== 'boolean') return undefined;

  const summary = { method, success: response.success };
  if (response.success) return summary;

  const { code, error } = response.payload ?? {};
  return {
    ...summary,
    ...(typeof code === 'string' || typeof code === 'number' ? { code } : {}),
    ...(typeof error === 'string' ? { error } : {}),
  };
};

const getSigningRequestLogSummary = (value: unknown, method: string): Record<string, unknown> => {
  const blockedSummary: Record<string, unknown> = {
    method,
    payload: '[REDACTED]',
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return blockedSummary;

  const message = value as Record<string, unknown>;
  const nestedPayload =
    message.payload && typeof message.payload === 'object' && !Array.isArray(message.payload)
      ? (message.payload as Record<string, unknown>)
      : undefined;
  const params = nestedPayload?.method === method ? nestedPayload : message;
  const transaction =
    params.transaction &&
    typeof params.transaction === 'object' &&
    !Array.isArray(params.transaction)
      ? (params.transaction as Record<string, unknown>)
      : undefined;

  const summary: Record<string, unknown> = { method };
  const copyScalar = (outputKey: string, ...candidates: unknown[]) => {
    const valueToLog = candidates.find(
      candidate =>
        typeof candidate === 'string' ||
        typeof candidate === 'number' ||
        typeof candidate === 'boolean'
    );
    if (valueToLog !== undefined) summary[outputKey] = valueToLog;
  };

  copyScalar('chainId', params.chainId, transaction?.chainId);
  copyScalar('transactionType', params.transactionType, params.txType, transaction?.txType);
  copyScalar('coin', params.coin);
  copyScalar('coinType', params.coinType);
  copyScalar('network', params.network);
  copyScalar('networkId', params.networkId, params.network_id);
  copyScalar('noScriptType', params.noScriptType);
  copyScalar('dAppSignType', params.dAppSignType);

  if (Array.isArray(params.inputs)) summary.inputCount = params.inputs.length;
  if (Array.isArray(params.outputs)) summary.outputCount = params.outputs.length;

  return Object.keys(summary).length > 1 ? summary : blockedSummary;
};

const redactLogValue = (
  value: unknown,
  seen: WeakSet<object>,
  shouldRedactKey: (key: string) => boolean = isSensitiveLogKey
): unknown => {
  if (ArrayBuffer.isView(value)) {
    return `[BINARY:${value.byteLength}]`;
  }
  if (value instanceof ArrayBuffer) {
    return `[BINARY:${value.byteLength}]`;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return '[CIRCULAR]';
    seen.add(value);
    const redacted = value.map(item => redactLogValue(item, seen, shouldRedactKey));
    seen.delete(value);
    return redacted;
  }
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';

  seen.add(value);
  const redacted = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      shouldRedactKey(key) && item !== null && item !== undefined
        ? '[REDACTED]'
        : redactLogValue(item, seen, shouldRedactKey),
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
  if (methodName && (LogLabelMethod.has(methodName) || isSigningMethod(methodName))) {
    return methodName;
  }

  return undefined;
}

export function getSafeLogPayload(
  value: unknown,
  blockLabel?: string,
  options: { revealSigningPayload?: boolean } = {}
): unknown {
  if (blockLabel && isSigningMethod(blockLabel)) {
    const responseSummary = getSigningResponseLogSummary(value, blockLabel);
    if (responseSummary) return responseSummary;
  }

  if (blockLabel && isSigningMethod(blockLabel) && options.revealSigningPayload) {
    return redactLogValue(value, new WeakSet(), isCriticalSensitiveLogKey);
  }

  if (blockLabel && isSigningMethod(blockLabel)) {
    return getSigningRequestLogSummary(value, blockLabel);
  }

  if (blockLabel && (LogBlockEvent.has(blockLabel) || LogPayloadBlockMethod.has(blockLabel))) {
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
