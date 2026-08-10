import { Buffer } from 'buffer';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

// Top-level and low-level SDK instances can be separated by JSON-only hosts,
// including browser extension background/offscreen message bridges.
const BRIDGE_BINARY_PAYLOAD_MARKER = '__onekey_hd_bridge_binary_payload__';

type BridgeBinaryPayload = {
  [BRIDGE_BINARY_PAYLOAD_MARKER]: 1;
  data: string;
  type: 'array-buffer' | 'uint8-array';
};

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const invalidBinaryPayload = (message: string) =>
  ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, message);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isArrayBufferValue(value: unknown): value is ArrayBuffer {
  return Boolean(
    typeof ArrayBuffer !== 'undefined' &&
      (value instanceof ArrayBuffer ||
        Object.prototype.toString.call(value) === '[object ArrayBuffer]')
  );
}

function isBlobValue(value: unknown): value is Blob {
  return Boolean(
    typeof Blob !== 'undefined' &&
      (value instanceof Blob || Object.prototype.toString.call(value) === '[object Blob]') &&
      typeof (value as Blob).arrayBuffer === 'function'
  );
}

function readBinaryPayload(value: unknown): BridgeBinaryPayload | undefined {
  if (!isPlainObject(value) || !(BRIDGE_BINARY_PAYLOAD_MARKER in value)) return undefined;
  const payload = value as Partial<BridgeBinaryPayload>;
  if (
    payload[BRIDGE_BINARY_PAYLOAD_MARKER] !== 1 ||
    (payload.type !== 'array-buffer' && payload.type !== 'uint8-array') ||
    typeof payload.data !== 'string'
  ) {
    throw invalidBinaryPayload('Invalid bridge binary payload');
  }
  return payload as BridgeBinaryPayload;
}

function bytesToPayload(bytes: Uint8Array, type: BridgeBinaryPayload['type']): BridgeBinaryPayload {
  return {
    [BRIDGE_BINARY_PAYLOAD_MARKER]: 1,
    data: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64'),
    type,
  };
}

function payloadToBytes(payload: BridgeBinaryPayload): Uint8Array {
  if (payload.data.length % 4 !== 0 || !BASE64_PATTERN.test(payload.data)) {
    throw invalidBinaryPayload('Invalid bridge binary payload data');
  }
  const decoded = Buffer.from(payload.data, 'base64');
  if (decoded.toString('base64') !== payload.data) {
    throw invalidBinaryPayload('Invalid bridge binary payload data');
  }
  return Uint8Array.from(decoded);
}

async function encodeValue(value: unknown, seen: WeakSet<object>): Promise<unknown> {
  if (isArrayBufferValue(value)) {
    return bytesToPayload(new Uint8Array(value), 'array-buffer');
  }
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value)) {
    return bytesToPayload(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      'uint8-array'
    );
  }
  if (isBlobValue(value)) {
    return bytesToPayload(new Uint8Array(await value.arrayBuffer()), 'uint8-array');
  }

  const encodedPayload = readBinaryPayload(value);
  if (encodedPayload) return encodedPayload;
  if (Array.isArray(value)) {
    if (seen.has(value)) throw invalidBinaryPayload('Circular bridge payload');
    seen.add(value);
    try {
      const encoded: unknown[] = [];
      for (const item of value) {
        encoded.push(await encodeValue(item, seen));
      }
      return encoded.some((item, index) => item !== value[index]) ? encoded : value;
    } finally {
      seen.delete(value);
    }
  }
  if (!isPlainObject(value)) return value;
  if (seen.has(value)) throw invalidBinaryPayload('Circular bridge payload');
  seen.add(value);
  try {
    const entries: [string, unknown][] = [];
    for (const [key, item] of Object.entries(value)) {
      entries.push([key, await encodeValue(item, seen)]);
    }
    return entries.some(([key, item]) => item !== value[key]) ? Object.fromEntries(entries) : value;
  } finally {
    seen.delete(value);
  }
}

function decodeValue(value: unknown): unknown {
  const payload = readBinaryPayload(value);
  if (payload) {
    const bytes = payloadToBytes(payload);
    return payload.type === 'array-buffer' ? bytes.buffer : bytes;
  }
  if (Array.isArray(value)) {
    const decoded = value.map(decodeValue);
    return decoded.some((item, index) => item !== value[index]) ? decoded : value;
  }
  if (!isPlainObject(value)) return value;
  const entries = Object.entries(value).map(([key, item]) => [key, decodeValue(item)] as const);
  return entries.some(([key, item]) => item !== value[key]) ? Object.fromEntries(entries) : value;
}

export async function encodeBridgeBinaryPayload(value: unknown): Promise<unknown> {
  return encodeValue(value, new WeakSet());
}

export function decodeBridgeBinaryPayload(value: unknown): unknown {
  return decodeValue(value);
}
