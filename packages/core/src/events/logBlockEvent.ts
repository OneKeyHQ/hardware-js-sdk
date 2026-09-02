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

// Debug signing logs may show tx/message fields. These stems still stay redacted.
// `session` is exact-only so `sessionId` remains visible for QA.
const CriticalExactLogKeys: Set<string> = new Set(['session']);
const CriticalSubstringLogKeys = [
  'credential',
  'entropy',
  'mnemonic',
  'password',
  'privatekey',
  'secret',
  'seed',
  'xprv',
] as const;
const CriticalSuffixLogKeys = ['apikey', 'passphrase', 'pin', 'token', 'word', 'words'] as const;

// `useEmptyPassphrase` would otherwise match the passphrase suffix rule.
const DebugVisibleLogKeys: Set<string> = new Set([
  'expectedpassphrasestate',
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
    CriticalExactLogKeys.has(normalizedKey) ||
    CriticalSubstringLogKeys.some(stem => normalizedKey.includes(stem)) ||
    CriticalSuffixLogKeys.some(stem => normalizedKey.endsWith(stem))
  );
};

const asPlainObject = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
};

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const getSigningResponseLogSummary = (
  value: unknown,
  method: string
): Record<string, unknown> | undefined => {
  const response = asPlainObject(value);
  if (typeof response?.success !== 'boolean') return undefined;

  const summary: Record<string, unknown> = { method, success: response.success };
  if (response.success) return summary;

  const payload = asPlainObject(response.payload);
  if (typeof payload?.code === 'string' || typeof payload?.code === 'number') {
    summary.code = payload.code;
  }
  if (typeof payload?.error === 'string') {
    summary.error = payload.error;
  }
  return summary;
};

const getSigningRequestLogSummary = (value: unknown, method: string): Record<string, unknown> => {
  const blockedSummary = { method, payload: '[REDACTED]' };
  const message = asPlainObject(value);
  if (!message) return blockedSummary;

  const nestedPayload = asPlainObject(message.payload);
  const params = nestedPayload?.method === method ? nestedPayload : message;
  const transaction = asPlainObject(params.transaction) ?? {};
  const summary: Record<string, unknown> = { method };

  const assign = (outputKey: string, ...candidates: unknown[]) => {
    const valueToLog = candidates.find(isScalar);
    if (valueToLog !== undefined) summary[outputKey] = valueToLog;
  };

  assign('chainId', params.chainId, transaction.chainId);
  assign('transactionType', params.transactionType, params.txType, transaction.txType);
  assign('coin', params.coin);
  assign('coinType', params.coinType);
  assign('network', params.network);
  assign('networkId', params.networkId, params.network_id);
  assign('noScriptType', params.noScriptType);
  assign('dAppSignType', params.dAppSignType);

  if (Array.isArray(params.inputs)) summary.inputCount = params.inputs.length;
  if (Array.isArray(params.outputs)) summary.outputCount = params.outputs.length;

  return Object.keys(summary).length > 1 ? summary : blockedSummary;
};

const redactLogValue = (
  value: unknown,
  seen: WeakSet<object>,
  shouldRedactKey: (key: string) => boolean = isSensitiveLogKey
): unknown => {
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
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
    return (
      getSigningResponseLogSummary(value, blockLabel) ??
      (options.revealSigningPayload
        ? redactLogValue(value, new WeakSet(), isCriticalSensitiveLogKey)
        : getSigningRequestLogSummary(value, blockLabel))
    );
  }

  if (blockLabel && (LogBlockEvent.has(blockLabel) || LogPayloadBlockMethod.has(blockLabel))) {
    return { method: blockLabel, payload: '[REDACTED]' };
  }

  const redactedValue = redactLogValue(value, new WeakSet());
  const redactedObject = asPlainObject(redactedValue);
  if (blockLabel && redactedObject) {
    return { ...redactedObject, method: blockLabel };
  }
  return redactedValue;
}

export function formatLogMethodLabel(label: string, methodName?: string): string {
  return methodName ? `${label} [${methodName}]` : label;
}
