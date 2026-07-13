import { PROTOCOL_V2_PACKET_SRC_COMMAND } from '../../constants';
import { ProtocolV2FrameAssembler, concatUint8Arrays } from './frame-assembler';
import { ProtocolV2SequenceCursor } from './sequence-cursor';
import { ProtocolV2 } from '..';
import * as check from '../../utils/highlevel-checks';
import { LogBlockCommand } from '../../utils/logBlockCommand';

import type { Root } from 'protobufjs/light';
import type { MessageFromOneKey } from '../../types';

export type ProtocolV2Schemas = {
  protocolV1: Root;
  protocolV2: Root;
};

export type ProtocolV2CallContext = {
  messageName: string;
  timeoutMs?: number;
  highVolume: boolean;
  generation: number;
};

type ProtocolLogger = {
  debug?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
};

export type ProtocolV2SessionOptions = {
  schemas: ProtocolV2Schemas;
  router: number;
  packetSrc?: number;
  maxFrameBytes?: number;
  prepareCall?: (context: ProtocolV2CallContext) => Promise<void> | void;
  writeFrame: (frame: Uint8Array, context: ProtocolV2CallContext) => Promise<void>;
  readFrame: (context: ProtocolV2CallContext) => Promise<Uint8Array>;
  logger?: ProtocolLogger;
  logPrefix?: string;
  createTimeoutError?: (name: string, timeoutMs: number) => Error;
  sequenceCursor?: ProtocolV2SequenceCursor;
  generation?: number;
};

export type ProtocolV2CallOptions = {
  timeoutMs?: number;
  expectedTypes?: string[];
  intermediateTypes?: string[];
  onIntermediateResponse?: (response: MessageFromOneKey) => void;
};

export { concatUint8Arrays, ProtocolV2FrameAssembler };
export { ProtocolV2SequenceCursor };

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 !== 0) {
    throw new Error(`Invalid hex string: odd length ${clean.length}`);
  }
  if (!/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error('Invalid hex string: contains non-hex characters');
  }
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

// Frame header bytes worth logging: SOF, len lo/hi, header CRC, router, attr, seq.
// The rest of the frame is protobuf payload and may contain sensitive fields
// (mnemonic words via WordAck, PINs, seeds via LoadDevice, ...), so raw frame
// hex logs must never include it.
const PROTOCOL_V2_DEBUG_HEADER_BYTES = 7;
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

function frameHeaderDebugHex(frame: Uint8Array): string {
  // Only the frame header is dumped as hex; the payload is logged separately
  // in sanitized/structured form (sanitizeProtocolV2DebugPayload).
  return bytesToHex(frame.slice(0, PROTOCOL_V2_DEBUG_HEADER_BYTES));
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
  createTimeoutError: () => Error,
  onTimeout?: () => void
): Promise<T> {
  if (!timeoutMs) return promise;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          // Give the caller a chance to cancel the underlying work; a plain
          // Promise.race rejection leaves the raced promise running.
          onTimeout?.();
          reject(createTimeoutError());
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Write completion is owned by the concrete transport. A Promise.race watchdog
// here can return while libusb/WebUSB is still flushing a large Protocol V2
// frame, which desynchronizes later request/response pairs.
export const PROTOCOL_V2_WRITE_WATCHDOG_TIMEOUT_MS = 0;

export class ProtocolV2Session {
  private readonly options: ProtocolV2SessionOptions;

  private readonly sequenceCursor: ProtocolV2SequenceCursor;

  // Serializes call() invocations: responses are matched only by type, so two
  // in-flight calls on the same session would steal each other's responses.
  private pendingCall: Promise<unknown> = Promise.resolve();

  constructor(options: ProtocolV2SessionOptions) {
    this.options = options;
    this.sequenceCursor = options.sequenceCursor ?? new ProtocolV2SequenceCursor();
  }

  call(
    name: string,
    data: Record<string, unknown>,
    callOptions: ProtocolV2CallOptions = {}
  ): Promise<MessageFromOneKey> {
    const run = () => this.executeCall(name, data, callOptions);
    const result = this.pendingCall.then(run, run);
    // Keep the chain alive even when a call fails; errors still propagate to
    // the per-call promise returned below.
    this.pendingCall = result.catch(() => undefined);
    return result;
  }

  private async executeCall(
    name: string,
    data: Record<string, unknown>,
    callOptions: ProtocolV2CallOptions
  ): Promise<MessageFromOneKey> {
    const {
      schemas,
      router,
      packetSrc = PROTOCOL_V2_PACKET_SRC_COMMAND,
      maxFrameBytes,
      prepareCall,
      writeFrame,
      readFrame,
      logger,
      logPrefix = 'ProtocolV2',
      createTimeoutError,
      generation = 0,
    } = this.options;

    const shouldReduceDebug = shouldReduceProtocolV2Debug(name);
    const callContext: ProtocolV2CallContext = {
      messageName: name,
      timeoutMs: callOptions.timeoutMs,
      highVolume: shouldReduceDebug,
      generation,
    };
    await prepareCall?.(callContext);
    const protoSeq = this.sequenceCursor.next();
    const frame = ProtocolV2.encodeFrame(schemas, name, data, {
      packetSrc,
      router,
      seq: protoSeq,
      logger: shouldReduceDebug ? undefined : logger,
      logPrefix,
      context: `tx:${name}`,
    });
    const expectedSeq = frame[6];

    if (maxFrameBytes !== undefined && frame.length > maxFrameBytes) {
      throw new Error(
        `Protocol V2 frame too large for transport: ${frame.length} > ${maxFrameBytes}`
      );
    }

    if (!shouldReduceDebug) {
      logger?.debug?.(
        `[${logPrefix}] TX payload name=${name}`,
        sanitizeProtocolV2DebugPayload(data)
      );
      logger?.debug?.(
        `[${logPrefix}] TX frame name=${name} len=${frame.length} router=${frame[4]} attr=${
          frame[5]
        } seq=${expectedSeq} headerHex=${frameHeaderDebugHex(frame)}`
      );
    }

    // Lenient watchdog on the write phase only — see
    // PROTOCOL_V2_WRITE_WATCHDOG_TIMEOUT_MS for the rationale.
    await withProtocolTimeout(
      writeFrame(frame, callContext),
      PROTOCOL_V2_WRITE_WATCHDOG_TIMEOUT_MS,
      () =>
        new Error(
          `Protocol V2 write timeout after ${PROTOCOL_V2_WRITE_WATCHDOG_TIMEOUT_MS}ms for ${name}`
        )
    );

    // Cancellation flag for the read loop: when the response timeout fires,
    // Promise.race alone would leave this loop running as a zombie that keeps
    // consuming frames meant for the next call. The timeout callback flips the
    // flag so the loop exits and discards any late frame.
    const cancellation = { cancelled: false };

    const readResponse = async (): Promise<MessageFromOneKey> => {
      // Some Protocol V2 operations emit progress notifications before the
      // terminal response. Consume those frames here so callers still see a
      // request/terminal-response shaped API.
      while (!cancellation.cancelled) {
        const rxFrame = await readFrame(callContext);
        if (cancellation.cancelled) {
          // Timed out while waiting: drop the late frame and stop reading.
          break;
        }
        if (!shouldReduceDebug) {
          logger?.debug?.(
            `[${logPrefix}] RX frame len=${rxFrame.length} router=${rxFrame[4]} attr=${
              rxFrame[5]
            } seq=${rxFrame[6]} headerHex=${frameHeaderDebugHex(rxFrame)}`
          );
        }
        const isAck = ProtocolV2.isAckFrame(rxFrame);
        if (isAck) {
          if (!shouldReduceDebug) {
            logger?.debug?.(`[${logPrefix}] skip Proto Link ACK seq=${rxFrame[6]}`);
          }
        }
        if (!isAck) {
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
          } else if (!shouldReduceDebug) {
            logger?.debug?.(
              `[${logPrefix}] skip unexpected response for ${name}: expected=${callOptions.expectedTypes?.join(
                '|'
              )} got=${response.type}`
            );
          }
        }
      }
      // Only reachable after cancellation; the outer promise has already been
      // rejected by the timeout, so this rejection is consumed by the race.
      throw new Error(`Protocol V2 read loop cancelled after timeout for ${name}`);
    };

    return withProtocolTimeout(
      readResponse(),
      callOptions.timeoutMs,
      () =>
        createTimeoutError
          ? createTimeoutError(name, callOptions.timeoutMs ?? 0)
          : new Error(`Protocol V2 response timeout after ${callOptions.timeoutMs}ms for ${name}`),
      () => {
        cancellation.cancelled = true;
      }
    );
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
  let probeError: unknown;
  try {
    await onBeforeProbe?.();
    const response = await call(
      'Ping',
      { message: 'protocol-v2-probe' },
      { timeoutMs, expectedTypes: ['Success'] }
    );
    if (response.type === 'Success') {
      return true;
    }
    probeError = new Error(`unexpected response type ${response.type}`);
  } catch (error) {
    probeError = error;
  }

  logger?.debug?.(`[${logPrefix}] Protocol V2 probe failed:`, getErrorMessage(probeError));
  await onProbeFailed?.(probeError);
  return false;
}
