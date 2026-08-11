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
  if (methodName && (LogLabelMethod.has(methodName) || isSigningMethod(methodName))) {
    return methodName;
  }

  return undefined;
}

export function getSafeLogPayload(value: unknown, blockLabel?: string): unknown {
  if (
    blockLabel &&
    (LogBlockEvent.has(blockLabel) ||
      LogPayloadBlockMethod.has(blockLabel) ||
      isSigningMethod(blockLabel))
  ) {
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
