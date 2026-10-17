/**
 * Log-safe summaries of call params and results. Hardware logs are exported to support, so
 * transaction contents, keys and full addresses are replaced by length + short hash, while
 * paths, chain ids, flags and error fields stay readable for reproduction.
 */
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

export type LogSummaryContext = {
  /** Method name from the options, or '' when none was given. */
  method: string;
  role: 'params' | 'result';
};

/**
 * Returns extra space-separated hints for a payload field (e.g. PSBT input/output counts), or
 * undefined to add nothing. `key` is normalized: lower-case with `_` and `-` removed. Hints are
 * appended verbatim, so they must not contain payload contents. A throwing describer is ignored.
 */
export type LogPayloadDescriber = (
  key: string,
  value: string | Uint8Array,
  context: LogSummaryContext
) => string | undefined;

export type LogSummaryOptions = {
  /** Public or connector method name; enables chain-specific hints (EVM tx type). */
  method?: string;
  /** In results, transaction fields hold signed transactions rather than requests. */
  role?: 'params' | 'result';
  /** Chain-specific payload hints that need a decoder adapter-core does not ship. */
  describePayload?: LogPayloadDescriber;
};

type Context = LogSummaryContext & {
  describePayload?: LogPayloadDescriber;
  inError: boolean;
  ancestors: Set<object>;
};

const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 20;
const MAX_PLAIN_STRING = 64;
const MAX_ERROR_STRING = 500;

// Keys match after normalization, so camelCase and snake_case spellings hit the same entry.
const normalizeKey = (key: string) => key.replace(/[_-]/g, '').toLowerCase();
const keySet = (keys: string[]) => new Set(keys.map(normalizeKey));

const KEEP_KEYS = keySet([
  'path',
  'paths',
  'derivationPath',
  'fullPath',
  'basePath',
  'method',
  'methodName',
  'chainId',
  'coin',
  'network',
  'networkName',
  'scriptType',
  'template',
  'appName',
  '_tag',
  'code',
  'errorCode',
  'statusCode',
]);
const ERROR_TEXT_KEYS = keySet(['message', 'error', 'errorMessage', 'originalMessage']);
const ERROR_CONTEXT_KEYS = keySet(['error', 'err', 'originalError', 'cause']);
const SECRET_KEYS = keySet([
  'ufvk',
  'orchardFvk',
  'fvk',
  'viewingKey',
  'passphraseState',
  'passphrase',
  'password',
  'pin',
  'mnemonic',
  'mnemonics',
  'word',
  'words',
  'seed',
  'entropy',
  'privateKey',
  'xprv',
  'mac',
  // THP pairing and channel material.
  'credential',
  'credentials',
  'hostStaticKey',
  'trezorStaticPublicKey',
  // Wallet sessions and host connection records.
  'session',
  'sessionId',
  'knownConnections',
  'extra',
]);
const KEY_MATERIAL_KEYS = keySet([
  'xpub',
  'ypub',
  'zpub',
  'tpub',
  'extendedPublicKey',
  'publicKey',
  'pubkey',
  'pub',
  'chainCode',
  'tapInternalKey',
]);
const SIGNATURE_KEYS = keySet(['signature', 'signatures', 'sig', 'r', 's', 'v', 'partialSig']);
const SIGNED_TX_KEYS = keySet(['signedTx', 'signedTransaction', 'signedTxHex']);
const SIGNED_PSBT_KEYS = keySet(['signedPsbt']);
const PAYLOAD_KEYS = keySet([
  'serializedTx',
  'rawTx',
  'rawTxHex',
  'txHex',
  'tx',
  'transaction',
  'psbt',
  'message',
  'messageHex',
  'data',
  'dataJson',
  'typedData',
  'hex',
  'bytes',
  'apdu',
  'domainSeparatorHash',
  'messageHash',
  'encodedNetwork',
  'encodedToken',
  'refBlockBytes',
  'refBlockHash',
  'opReturnData',
  'scriptSig',
  'witness',
  'extraData',
  // Structured transaction contents (Trezor-style and Tron params).
  'contract',
  'inputs',
  'outputs',
  'refTxs',
  'paymentRequest',
  'paymentRequests',
  'additionalInfo',
  'accessList',
  'memos',
]);
const ADDRESS_KEYS = keySet([
  'to',
  'from',
  'recipient',
  'verifyingContract',
  'requiredSigners',
  'tokenMint',
  'tokenAccount',
  'tokenProgram',
]);
const TX_IN_RESULT_KEYS = keySet(['serializedTx', 'rawTx', 'rawTxHex', 'txHex', 'tx']);
// Amounts are transaction contents; even their length hints at the magnitude.
const AMOUNT_KEYS = keySet(['value', 'amount', 'amounts', 'fee', 'fees', 'tokenAmount']);
const ERROR_FIELDS = ['_tag', 'code', 'errorCode', 'statusCode', 'originalError'];

const XPUB_RE = /^[a-zA-Z]pub[1-9A-HJ-NP-Za-km-z]{90,}$/;
const HEX_RE = /^(0x)?[0-9a-fA-F]*$/;

const EVM_TX_TYPES: Record<number, string> = {
  1: 'eip2930',
  2: 'eip1559',
  3: 'eip4844',
  4: 'eip7702',
};

// Strings hash as UTF-8, so the value can be matched against the caller's own copy.
function sha256Short(input: Uint8Array | string): string {
  return bytesToHex(sha256(typeof input === 'string' ? utf8ToBytes(input) : input)).slice(0, 16);
}

function toBytes(value: unknown): Uint8Array | undefined {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  // A Buffer that already went through JSON (e.g. across an IPC bridge).
  if (
    value &&
    typeof value === 'object' &&
    (value as { type?: unknown }).type === 'Buffer' &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return Uint8Array.from((value as { data: number[] }).data);
  }
  return undefined;
}

function isPlainHex(value: string): boolean {
  return value.length > 0 && HEX_RE.test(value) && value !== '0x';
}

function stripHexPrefix(value: string): string {
  return value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
}

function maskAddress(value: string): string {
  if (value.length <= 12) return `<addr len=${value.length}>`;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function summarizeKeyMaterial(value: unknown): string {
  const bytes = toBytes(value);
  if (bytes) return `… len=${bytes.length}`;
  const text = String(value);
  return XPUB_RE.test(text) ? `${text.slice(0, 4)}… len=${text.length}` : `… len=${text.length}`;
}

function lengthOf(value: unknown): number {
  const bytes = toBytes(value);
  if (bytes) return bytes.length;
  if (typeof value === 'string') return value.length;
  const json = safeJson(value);
  return json === undefined ? 0 : json.length;
}

function safeJson(value: unknown): string | undefined {
  try {
    return JSON.stringify(value, (_k, v: unknown) => (typeof v === 'bigint' ? `${v}n` : v));
  } catch {
    return undefined;
  }
}

function evmTxType(hex: string): string | undefined {
  const body = stripHexPrefix(hex);
  if (body.length < 2) return undefined;
  const first = parseInt(body.slice(0, 2), 16);
  if (first >= 0xc0) return 'legacy';
  return EVM_TX_TYPES[first];
}

function describe(key: string, value: string | Uint8Array, ctx: Context): string | undefined {
  if (!ctx.describePayload) return undefined;
  try {
    const hint = ctx.describePayload(key, value, { method: ctx.method, role: ctx.role });
    return typeof hint === 'string' && hint.length > 0 ? hint : undefined;
  } catch {
    return undefined;
  }
}

function jsonSummary(json: string, parsed: unknown): string {
  const primaryType =
    parsed && typeof parsed === 'object'
      ? (parsed as { primaryType?: unknown }).primaryType
      : undefined;
  const hint =
    typeof primaryType === 'string' && primaryType.length <= MAX_PLAIN_STRING
      ? ` primaryType=${primaryType}`
      : '';
  return `<json len=${json.length} sha256=${sha256Short(json)}${hint}>`;
}

function summarizePayload(key: string, value: unknown, ctx: Context): unknown {
  if (value === null || value === undefined || typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  const bytes = toBytes(value);
  if (bytes) {
    const hint = describe(key, bytes, ctx);
    return `<hex len=${bytes.length} sha256=${sha256Short(bytes)}${hint ? ` ${hint}` : ''}>`;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return jsonSummary(value, JSON.parse(value));
      } catch {
        // Not JSON; fall through to the plain string summary.
      }
    }
    const hints: string[] = [];
    if (key === 'serializedtx' && ctx.method.startsWith('evm') && isPlainHex(value)) {
      const type = evmTxType(value);
      if (type) hints.push(`type=${type}`);
    }
    const extra = describe(key, value, ctx);
    if (extra) hints.push(extra);
    const kind = isPlainHex(value) ? 'hex' : 'str';
    const suffix = hints.length ? ` ${hints.join(' ')}` : '';
    return `<${kind} len=${value.length} sha256=${sha256Short(value)}${suffix}>`;
  }
  const json = safeJson(value);
  if (json === undefined) return '<object unhashable>';
  return jsonSummary(json, value);
}

function summarizeString(value: string, key: string | undefined, ctx: Context): string {
  if (key && KEEP_KEYS.has(key)) return value;
  if (key && ctx.inError && ERROR_TEXT_KEYS.has(key)) {
    return value.length > MAX_ERROR_STRING ? `${value.slice(0, MAX_ERROR_STRING)}…` : value;
  }
  if (XPUB_RE.test(value)) return summarizeKeyMaterial(value);
  if (value.length <= MAX_PLAIN_STRING) return value;
  const kind = isPlainHex(value) ? 'hex' : 'str';
  return `<${kind} len=${value.length} sha256=${sha256Short(value)}>`;
}

function summarizeError(err: Error, depth: number, ctx: Context): Record<string, unknown> {
  const e = err as Error & Record<string, unknown>;
  const out: Record<string, unknown> = {
    name: err.name,
    message: summarizeString(err.message, 'message', ctx),
  };
  for (const field of ERROR_FIELDS) {
    if (e[field] !== undefined) {
      out[field] = summarizeValue(e[field], normalizeKey(field), depth + 1, ctx);
    }
  }
  return out;
}

function summarizeByKey(rawKey: string, value: unknown, depth: number, ctx: Context): unknown {
  const k = normalizeKey(rawKey);
  if (value === undefined || value === null) return value;
  if (SECRET_KEYS.has(k)) return `<redacted len=${lengthOf(value)}>`;
  if (KEY_MATERIAL_KEYS.has(k)) {
    if (typeof value === 'string' || toBytes(value)) return summarizeKeyMaterial(value);
  }
  if (SIGNATURE_KEYS.has(k)) {
    if (Array.isArray(value)) return `<signatures count=${value.length}>`;
    return `<signature len=${lengthOf(value)}>`;
  }
  if (SIGNED_PSBT_KEYS.has(k)) return `<psbt len=${lengthOf(value)}>`;
  if (SIGNED_TX_KEYS.has(k) || (ctx.role === 'result' && TX_IN_RESULT_KEYS.has(k))) {
    return `<signedTx len=${lengthOf(value)}>`;
  }
  if (AMOUNT_KEYS.has(k)) return '<amount>';
  if (ctx.inError && ERROR_TEXT_KEYS.has(k) && typeof value === 'string') {
    return summarizeString(value, k, ctx);
  }
  if (PAYLOAD_KEYS.has(k)) return summarizePayload(k, value, ctx);
  if (ADDRESS_KEYS.has(k) || k.endsWith('address') || k.endsWith('addresses')) {
    if (typeof value === 'string') return maskAddress(value);
    if (Array.isArray(value)) {
      return capArray(value, item => (typeof item === 'string' ? maskAddress(item) : '<addr>'));
    }
  }
  // Error text is kept only on an error object's own fields, not on params nested inside it.
  const inError = ERROR_CONTEXT_KEYS.has(k);
  const childCtx = inError === ctx.inError ? ctx : { ...ctx, inError };
  return summarizeValue(value, k, depth, childCtx);
}

function capArray(items: unknown[], map: (item: unknown, index: number) => unknown): unknown[] {
  const out = items.slice(0, MAX_ARRAY_ITEMS).map(map);
  if (items.length > MAX_ARRAY_ITEMS) out.push(`…+${items.length - MAX_ARRAY_ITEMS} more`);
  return out;
}

function summarizeValue(
  value: unknown,
  key: string | undefined,
  depth: number,
  ctx: Context
): unknown {
  switch (typeof value) {
    case 'undefined':
    case 'boolean':
      return value;
    case 'number':
      return Number.isFinite(value) ? value : String(value);
    case 'bigint':
      return `${value}n`;
    case 'string':
      return summarizeString(value, key, ctx);
    case 'function':
      return '<function>';
    case 'symbol':
      return '<symbol>';
    default:
      break;
  }
  if (value === null) return null;
  const bytes = toBytes(value);
  if (bytes) return `<hex len=${bytes.length} sha256=${sha256Short(bytes)}>`;
  const obj = value as object;
  if (ctx.ancestors.has(obj)) return '<circular>';
  if (depth >= MAX_DEPTH) return '<depth>';
  ctx.ancestors.add(obj);
  try {
    if (value instanceof Error) return summarizeError(value, depth, { ...ctx, inError: true });
    if (Array.isArray(value)) {
      return capArray(value, item => summarizeValue(item, key, depth + 1, ctx));
    }
    const out: Record<string, unknown> = {};
    for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) {
      out[childKey] = summarizeByKey(childKey, child, depth + 1, ctx);
    }
    return out;
  } finally {
    ctx.ancestors.delete(obj);
  }
}

/**
 * JSON-safe, log-safe summary of `value`. Never throws.
 *
 * Paths, chain ids, flags and error fields stay readable; payloads become
 * `<hex|str|json len=N sha256=16hex [hints]>`, addresses `first6…last4`, xpubs `xpub… len=N`,
 * public keys and chain codes `… len=N`, signatures `<signature len=N>` and secrets
 * `<redacted len=N>`.
 */
export function summarizeForLog(value: unknown, options: LogSummaryOptions = {}): unknown {
  try {
    return summarizeValue(value, undefined, 0, {
      method: options.method ?? '',
      role: options.role ?? 'params',
      describePayload: options.describePayload,
      inError: false,
      ancestors: new Set(),
    });
  } catch {
    return '<unloggable>';
  }
}
