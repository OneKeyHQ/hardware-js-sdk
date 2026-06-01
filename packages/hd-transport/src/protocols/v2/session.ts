import { PROTOCOL_V2_PACKET_SRC_COMMAND } from '../../constants';
import { ProtocolV2FrameAssembler, concatUint8Arrays } from './frame-assembler';
import { ProtocolV2 } from '..';
import * as check from '../../utils/highlevel-checks';
import { LogBlockCommand } from '../../utils/logBlockCommand';

import type { Root } from 'protobufjs/light';
import type { MessageFromOneKey } from '../../types';

export type ProtocolV2Schemas = {
  protocolV1: Root;
  protocolV2: Root;
};

type ProtocolLogger = {
  debug?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
};

export type ProtocolV2SessionOptions = {
  schemas: ProtocolV2Schemas;
  router: number;
  packetSrc?: number;
  writeFrame: (frame: Uint8Array) => Promise<void>;
  readFrame: () => Promise<Uint8Array>;
  logger?: ProtocolLogger;
  logPrefix?: string;
  createTimeoutError?: (name: string, timeoutMs: number) => Error;
};

export type ProtocolV2CallOptions = {
  timeoutMs?: number;
  expectedTypes?: string[];
  intermediateTypes?: string[];
  onIntermediateResponse?: (response: MessageFromOneKey) => void;
};

export { concatUint8Arrays, ProtocolV2FrameAssembler };

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length === 0 || clean.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const PROTOCOL_V2_DEBUG_HEX_LIMIT = 256;
const PROTOCOL_V2_DEBUG_ARRAY_ITEMS_LIMIT = 20;
const PROTOCOL_V2_DEBUG_OBJECT_KEYS_LIMIT = 40;
const PROTOCOL_V2_DEBUG_STRING_LIMIT = 512;
const PROTOCOL_V2_DEBUG_DEPTH_LIMIT = 4;
const HIGH_VOLUME_PROTOCOL_V2_CALLS = new Set([
  ...LogBlockCommand,
  'FilesystemFileRead',
  'FileRead',
  'EmmcFileRead',
]);

function shouldReduceProtocolV2Debug(name: string) {
  return HIGH_VOLUME_PROTOCOL_V2_CALLS.has(name);
}

function bytesToDebugHex(bytes: Uint8Array): string {
  const visibleBytes =
    bytes.length > PROTOCOL_V2_DEBUG_HEX_LIMIT
      ? bytes.slice(0, PROTOCOL_V2_DEBUG_HEX_LIMIT)
      : bytes;
  const suffix =
    bytes.length > PROTOCOL_V2_DEBUG_HEX_LIMIT
      ? `...(+${bytes.length - PROTOCOL_V2_DEBUG_HEX_LIMIT}B)`
      : '';
  return `${bytesToHex(visibleBytes)}${suffix}`;
}

function getBinaryByteLength(value: unknown): number | undefined {
  if (value instanceof ArrayBuffer) {
    return value.byteLength;
  }

  if (ArrayBuffer.isView(value)) {
    return value.byteLength;
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return value.size;
  }

  return undefined;
}

function summarizeRedactedData(value: unknown): string {
  const byteLength = getBinaryByteLength(value);
  if (byteLength !== undefined) {
    return `[redacted data: ${byteLength} bytes]`;
  }

  if (typeof value === 'string') {
    return `[redacted data: string length=${value.length}]`;
  }

  if (Array.isArray(value)) {
    return `[redacted data: array length=${value.length}]`;
  }

  if (value && typeof value === 'object') {
    return `[redacted data: object keys=${Object.keys(value).length}]`;
  }

  return `[redacted data: ${typeof value}]`;
}

function sanitizeProtocolV2DebugPayload(value: unknown, key = '', depth = 0): unknown {
  if (/^(data|payload)$/i.test(key) && value !== null && value !== undefined) {
    return summarizeRedactedData(value);
  }

  if (/(passphrase|pin|mnemonic|seed|private)/i.test(key)) {
    return '[redacted sensitive value]';
  }

  const byteLength = getBinaryByteLength(value);
  if (byteLength !== undefined) {
    return `[binary: ${byteLength} bytes]`;
  }

  if (typeof value === 'string') {
    return value.length > PROTOCOL_V2_DEBUG_STRING_LIMIT
      ? `${value.slice(0, PROTOCOL_V2_DEBUG_STRING_LIMIT)}... (len=${value.length})`
      : value;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (depth >= PROTOCOL_V2_DEBUG_DEPTH_LIMIT) {
    return Array.isArray(value)
      ? `[array length=${value.length}]`
      : `[object keys=${Object.keys(value).length}]`;
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, PROTOCOL_V2_DEBUG_ARRAY_ITEMS_LIMIT)
      .map(item => sanitizeProtocolV2DebugPayload(item, key, depth + 1));
    if (value.length > PROTOCOL_V2_DEBUG_ARRAY_ITEMS_LIMIT) {
      items.push(`... (${value.length - PROTOCOL_V2_DEBUG_ARRAY_ITEMS_LIMIT} more)`);
    }
    return items;
  }

  const entries = Object.entries(value).slice(0, PROTOCOL_V2_DEBUG_OBJECT_KEYS_LIMIT);
  const sanitized: Record<string, unknown> = {};
  entries.forEach(([entryKey, entryValue]) => {
    sanitized[entryKey] = sanitizeProtocolV2DebugPayload(entryValue, entryKey, depth + 1);
  });
  if (Object.keys(value).length > PROTOCOL_V2_DEBUG_OBJECT_KEYS_LIMIT) {
    sanitized.__truncated__ = `${
      Object.keys(value).length - PROTOCOL_V2_DEBUG_OBJECT_KEYS_LIMIT
    } more keys`;
  }
  return sanitized;
}

const COMMON_TERMINAL_RESPONSE_TYPES = new Set([
  'Failure',
  'ButtonRequest',
  'EntropyRequest',
  'PinMatrixRequest',
  'PassphraseRequest',
  'Deprecated_PassphraseStateRequest',
  'WordRequest',
]);

function isExpectedTerminalResponse(
  response: MessageFromOneKey,
  expectedTypes: string[] | undefined
) {
  if (!expectedTypes || expectedTypes.length === 0) return true;
  return expectedTypes.includes(response.type) || COMMON_TERMINAL_RESPONSE_TYPES.has(response.type);
}

export function getErrorMessage(error: unknown) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    const { message } = error as { message?: unknown };
    return typeof message === 'string' ? message : String(message ?? '');
  }
  return String(error);
}

export async function withProtocolTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  createTimeoutError: () => Error
): Promise<T> {
  if (!timeoutMs) return promise;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(createTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class ProtocolV2Session {
  private readonly options: ProtocolV2SessionOptions;

  constructor(options: ProtocolV2SessionOptions) {
    this.options = options;
  }

  call(
    name: string,
    data: Record<string, unknown>,
    callOptions: ProtocolV2CallOptions = {}
  ): Promise<MessageFromOneKey> {
    const {
      schemas,
      router,
      packetSrc = PROTOCOL_V2_PACKET_SRC_COMMAND,
      writeFrame,
      readFrame,
      logger,
      logPrefix = 'ProtocolV2',
      createTimeoutError,
    } = this.options;

    const callPromise = async () => {
      const shouldReduceDebug = shouldReduceProtocolV2Debug(name);
      const frame = ProtocolV2.encodeFrame(schemas, name, data, {
        packetSrc,
        router,
        logger: shouldReduceDebug ? undefined : logger,
        logPrefix,
        context: `tx:${name}`,
      });
      const expectedSeq = frame[6];

      if (!shouldReduceDebug) {
        logger?.debug?.(
          `[${logPrefix}] TX payload name=${name}`,
          sanitizeProtocolV2DebugPayload(data)
        );
        logger?.debug?.(
          `[${logPrefix}] TX frame name=${name} len=${frame.length} router=${frame[4]} attr=${
            frame[5]
          } seq=${expectedSeq} hex=${bytesToDebugHex(frame)}`
        );
      }

      await writeFrame(frame);

      const readResponse = async () => {
        // Some Protocol V2 operations emit progress notifications before the
        // terminal response. Consume those frames here so callers still see a
        // request/terminal-response shaped API.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const rxFrame = await readFrame();
          if (!shouldReduceDebug) {
            logger?.debug?.(
              `[${logPrefix}] RX frame len=${rxFrame.length} router=${rxFrame[4]} attr=${
                rxFrame[5]
              } seq=${rxFrame[6]} hex=${bytesToDebugHex(rxFrame)}`
            );
          }
          const decoded = ProtocolV2.decodeFrame(schemas, rxFrame, {
            logger: shouldReduceDebug ? undefined : logger,
            logPrefix,
            context: `rx:${name}`,
          });
          if (!shouldReduceDebug && decoded.seq !== expectedSeq) {
            logger?.debug?.(
              `[${logPrefix}] seq differs for ${name}: tx=${expectedSeq}, rx=${decoded.seq}`
            );
          }
          if (!shouldReduceDebug) {
            logger?.debug?.(
              `[${logPrefix}] TX name=${name} seq=${expectedSeq} | RX seq=${decoded.seq} messageTypeId=${decoded.messageTypeId} pbPayload=${decoded.pbPayload.length}B`
            );
            logger?.debug?.(
              `[${logPrefix}] RX payload type=${decoded.type} messageTypeId=${decoded.messageTypeId}`,
              sanitizeProtocolV2DebugPayload(decoded.message)
            );
          }

          const response = check.call(decoded);
          if (callOptions.intermediateTypes?.includes(response.type)) {
            callOptions.onIntermediateResponse?.(response);
          } else if (isExpectedTerminalResponse(response, callOptions.expectedTypes)) {
            return response;
          } else {
            logger?.debug?.(
              `[${logPrefix}] skip unexpected response for ${name}: expected=${callOptions.expectedTypes?.join(
                '|'
              )} got=${response.type}`
            );
          }
        }
      };

      return withProtocolTimeout(readResponse(), callOptions.timeoutMs, () =>
        createTimeoutError
          ? createTimeoutError(name, callOptions.timeoutMs ?? 0)
          : new Error(`Protocol V2 response timeout after ${callOptions.timeoutMs}ms for ${name}`)
      );
    };

    return callPromise();
  }
}

export async function probeProtocolV2({
  call,
  timeoutMs,
  logger,
  logPrefix = 'ProtocolV2',
  onBeforeProbe,
  onProbeFailed,
}: {
  call: (
    name: string,
    data: Record<string, unknown>,
    options?: ProtocolV2CallOptions
  ) => Promise<MessageFromOneKey>;
  timeoutMs: number;
  logger?: ProtocolLogger;
  logPrefix?: string;
  onBeforeProbe?: () => Promise<void> | void;
  onProbeFailed?: (error: unknown) => Promise<void> | void;
}) {
  let pingError: unknown;
  try {
    await onBeforeProbe?.();
    const response = await call(
      'Ping',
      { message: 'probe' },
      { timeoutMs, expectedTypes: ['Success'] }
    );
    if (response.type === 'Success') {
      return true;
    }
    pingError = new Error(`unexpected response type ${response.type}`);
  } catch (error) {
    pingError = error;
  }

  logger?.debug?.(`[${logPrefix}] Protocol V2 ping probe failed:`, getErrorMessage(pingError));
  await onProbeFailed?.(pingError);
  return false;
}
