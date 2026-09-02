import {
  PROTOCOL_V2_DEFAULT_RESPONSE_TIMEOUT_MS,
  PROTOCOL_V2_PACKET_SRC_COMMAND,
} from '../../constants';
import { ProtocolV2FrameAssembler, concatUint8Arrays } from './frame-assembler';
import { ProtocolV2SequenceCursor } from './sequence-cursor';
import {
  ProtocolV2LinkError,
  createProtocolV2LinkDisabledError,
  isProtocolV2LinkDisabledError,
  isProtocolV2LinkDisabledFailure,
} from './errors';
import { ProtocolV2 } from '..';
import * as check from '../../utils/highlevel-checks';
import { LogBlockCommand } from '../../utils/logBlockCommand';

import type { Root } from 'protobufjs/light';
import type { MessageFromOneKey, TransportWriteMetrics } from '../../types';

export * from './errors';

export type ProtocolV2Schemas = {
  protocolV1: Root;
  protocolV2: Root;
};

export type ProtocolV2CallContext = {
  messageName: string;
  timeoutMs?: number;
  highThroughput: boolean;
  writeWithResponse?: boolean;
  generation: number;
  signal: AbortSignal;
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
  onWriteCompleted?: (metrics: TransportWriteMetrics) => void;
  returnAfterWrite?: boolean;
  onResponseAfterWrite?: (response: MessageFromOneKey) => void;
  writeWithResponse?: boolean;
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

export function detectProtocolV2LinkDisabledError({
  schemas,
  assembler,
  bytes,
}: {
  schemas: ProtocolV2Schemas;
  assembler: ProtocolV2FrameAssembler;
  bytes: Uint8Array;
}) {
  try {
    for (const frame of assembler.drain(bytes)) {
      const response = check.call(ProtocolV2.decodeFrame(schemas, frame));
      if (response.type === 'Failure') {
        const failureCode = response.message?.code;
        const firmwareMessage = response.message?.message;
        if (isProtocolV2LinkDisabledFailure(failureCode, firmwareMessage)) {
          return createProtocolV2LinkDisabledError(failureCode, firmwareMessage);
        }
      }
    }
  } catch {
    // Cross-protocol detection may receive a normal Protocol V1 notification.
    assembler.reset();
  }
  return undefined;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function createProtocolV2FrameTooLargeError(frameBytes: number, maxFrameBytes: number): Error {
  return Object.assign(
    new Error(`Protocol V2 frame too large for transport: ${frameBytes} > ${maxFrameBytes}`),
    {
      name: 'ProtocolV2FrameTooLargeError',
      frameBytes,
      maxFrameBytes,
    }
  );
}

const REDUCED_DEBUG_PROTOCOL_V2_CALLS = new Set([
  ...LogBlockCommand,
  'FilesystemFileRead',
  'FileRead',
  'EmmcFileRead',
]);

function shouldReduceProtocolV2Debug(name: string) {
  return REDUCED_DEBUG_PROTOCOL_V2_CALLS.has(name);
}

const HIGH_THROUGHPUT_PROTOCOL_V2_CALLS = new Set([
  'FilesystemFileWrite',
  'FileWrite',
  'EmmcFileWrite',
  'FirmwareUpload',
  'ResourceAck',
  'FilesystemFileRead',
  'FileRead',
  'EmmcFileRead',
]);

export function isProtocolV2HighThroughputCall(name: string) {
  return HIGH_THROUGHPUT_PROTOCOL_V2_CALLS.has(name);
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
  onTimeout?: () => void,
  abortSignal?: AbortSignal
): Promise<T> {
  if (!timeoutMs) return promise;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;
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
      ...(abortSignal
        ? [
            new Promise<never>((_, reject) => {
              abortHandler = () => {
                reject(new Error('Protocol V2 operation aborted'));
              };
              if (abortSignal.aborted) {
                abortHandler();
              } else {
                abortSignal.addEventListener('abort', abortHandler, { once: true });
              }
            }),
          ]
        : []),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (abortHandler) {
      abortSignal?.removeEventListener('abort', abortHandler);
    }
  }
}

export class ProtocolV2Session {
  private readonly options: ProtocolV2SessionOptions;

  private readonly sequenceCursor: ProtocolV2SequenceCursor;

  // Serializes call() invocations: responses are matched only by type, so two
  // in-flight calls on the same session would steal each other's responses.
  private pendingCall: Promise<unknown> = Promise.resolve();

  // Flow-control messages may interrupt a call that is waiting for a device UI
  // response, but their frames must never interleave with the active request write.
  private pendingWrite: Promise<unknown> = Promise.resolve();

  private pendingResponseAfterWrite?: {
    expectedTypes: Set<string>;
    onResponse?: (response: MessageFromOneKey) => void;
  };

  private lastResponseSequence?: number;

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

  sendFlowControl(name: string, data: Record<string, unknown>): Promise<MessageFromOneKey> {
    const {
      schemas,
      router,
      packetSrc = PROTOCOL_V2_PACKET_SRC_COMMAND,
      maxFrameBytes,
      writeFrame,
      generation = 0,
    } = this.options;
    const abortController = new AbortController();
    const context: ProtocolV2CallContext = {
      messageName: name,
      highThroughput: false,
      generation,
      signal: abortController.signal,
    };
    const protoSeq = this.sequenceCursor.next();
    const frame = ProtocolV2.encodeFrame(schemas, name, data, {
      packetSrc,
      router,
      seq: protoSeq,
    });

    if (maxFrameBytes !== undefined && frame.length > maxFrameBytes) {
      return Promise.reject(createProtocolV2FrameTooLargeError(frame.length, maxFrameBytes));
    }

    return this.serializeWrite(() => writeFrame(frame, context)).then(() => ({
      type: 'WriteCompleted',
      message: {},
    }));
  }

  private serializeWrite<T>(write: () => Promise<T>): Promise<T> {
    const result = this.pendingWrite.then(write, write);
    this.pendingWrite = result.catch(() => undefined);
    return result;
  }

  private executeCall(
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
    const timeoutMs =
      callOptions.timeoutMs && callOptions.timeoutMs > 0
        ? callOptions.timeoutMs
        : PROTOCOL_V2_DEFAULT_RESPONSE_TIMEOUT_MS;
    const abortController = new AbortController();

    const shouldReduceDebug = shouldReduceProtocolV2Debug(name);
    const baseCallContext: ProtocolV2CallContext = {
      messageName: name,
      timeoutMs,
      highThroughput: isProtocolV2HighThroughputCall(name),
      ...(callOptions.writeWithResponse === undefined
        ? {}
        : { writeWithResponse: callOptions.writeWithResponse }),
      generation,
      signal: abortController.signal,
    };

    const runCall = async (): Promise<MessageFromOneKey> => {
      // A write-only call may still have a terminal response in flight. Preserve
      // the continuous receive queue until the next call consumes that response.
      if (!this.pendingResponseAfterWrite) {
        await prepareCall?.(baseCallContext);
      }
      const protoSeq = this.sequenceCursor.next();
      const frame = ProtocolV2.encodeFrame(schemas, name, data, {
        packetSrc,
        router,
        seq: protoSeq,
      });

      if (maxFrameBytes !== undefined && frame.length > maxFrameBytes) {
        throw createProtocolV2FrameTooLargeError(frame.length, maxFrameBytes);
      }

      const writeStartedAt = Date.now();
      await this.serializeWrite(() => writeFrame(frame, baseCallContext));
      try {
        callOptions.onWriteCompleted?.({
          elapsedMs: Math.max(Date.now() - writeStartedAt, 0),
          frameBytes: frame.byteLength,
        });
      } catch (error) {
        logger?.error?.(`${logPrefix} write metrics callback failed: ${String(error)}`);
      }

      if (callOptions.returnAfterWrite) {
        if (callOptions.expectedTypes?.length) {
          this.pendingResponseAfterWrite = {
            expectedTypes: new Set(callOptions.expectedTypes),
            onResponse: callOptions.onResponseAfterWrite,
          };
        }
        return { type: 'WriteCompleted', message: {} };
      }

      // Some Protocol V2 operations emit progress notifications before the
      // terminal response. Consume those frames here so callers still see a
      // request/terminal-response shaped API.
      while (!abortController.signal.aborted) {
        const rxFrame = await readFrame(baseCallContext);
        if (abortController.signal.aborted) break;

        let header: ReturnType<typeof ProtocolV2.inspectFrameHeader>;
        try {
          header = ProtocolV2.inspectFrameHeader(rxFrame);
        } catch (cause) {
          throw new ProtocolV2LinkError(
            'frame',
            `Protocol V2 frame validation failed: ${getErrorMessage(cause)}`,
            cause
          );
        }
        if (header.router !== router) {
          throw new ProtocolV2LinkError(
            'router',
            `Protocol V2 router mismatch: expected ${router}, got ${header.router}`
          );
        }
        if (header.packetSrc !== packetSrc) {
          throw new ProtocolV2LinkError(
            'packet-source',
            `Protocol V2 packet source mismatch: expected ${packetSrc}, got ${header.packetSrc}`
          );
        }

        let isAck: boolean;
        try {
          isAck = ProtocolV2.isAckFrame(rxFrame);
        } catch (cause) {
          throw new ProtocolV2LinkError(
            'frame',
            `Protocol V2 ACK validation failed: ${getErrorMessage(cause)}`,
            cause
          );
        }
        if (isAck) {
          if (header.seq !== protoSeq) {
            throw new ProtocolV2LinkError(
              'ack-sequence',
              `Protocol V2 ACK sequence mismatch: expected ${protoSeq}, got ${header.seq}`
            );
          }
        } else {
          let decoded: ReturnType<typeof ProtocolV2.decodeFrame>;
          try {
            decoded = ProtocolV2.decodeFrame(schemas, rxFrame);
          } catch (cause) {
            throw new ProtocolV2LinkError(
              'frame',
              `Protocol V2 frame decode failed: ${getErrorMessage(cause)}`,
              cause
            );
          }
          // Firmware owns one TX sequence across all channels and packet sources,
          // so frames routed elsewhere create valid gaps in this session.
          if (this.lastResponseSequence === decoded.seq) {
            throw new ProtocolV2LinkError(
              'response-sequence',
              `Protocol V2 duplicate response sequence: ${decoded.seq}`
            );
          }
          this.lastResponseSequence = decoded.seq;

          const response = check.call(decoded);
          const { pendingResponseAfterWrite } = this;
          let belongsToWriteOnlyCall = false;
          if (pendingResponseAfterWrite) {
            belongsToWriteOnlyCall = pendingResponseAfterWrite.expectedTypes.has(response.type);
            if (belongsToWriteOnlyCall || COMMON_TERMINAL_RESPONSE_TYPES.has(response.type)) {
              this.pendingResponseAfterWrite = undefined;
              if (belongsToWriteOnlyCall) {
                try {
                  pendingResponseAfterWrite.onResponse?.(response);
                } catch (error) {
                  logger?.error?.(
                    `${logPrefix} delayed response callback failed: ${String(error)}`
                  );
                }
              }
            }
          }
          if (belongsToWriteOnlyCall) {
            // The delayed response belongs to the preceding write-only call.
          } else if (callOptions.intermediateTypes?.includes(response.type)) {
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

      throw new Error(`Protocol V2 read loop cancelled after timeout for ${name}`);
    };

    return withProtocolTimeout(
      runCall(),
      timeoutMs,
      () =>
        createTimeoutError
          ? createTimeoutError(name, timeoutMs)
          : new Error(`Protocol V2 response timeout after ${timeoutMs}ms for ${name}`),
      () => {
        abortController.abort();
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
  shouldRethrow,
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
  shouldRethrow?: (error: unknown) => boolean;
}) {
  let probeError: unknown;
  try {
    await onBeforeProbe?.();
    const response = await call(
      'Ping',
      { message: 'protocol-v2-probe' },
      {
        timeoutMs,
        expectedTypes: ['Success'],
      }
    );
    if (response.type === 'Success') {
      return true;
    }
    if (response.type === 'Failure') {
      const failureCode = response.message?.code;
      const firmwareMessage = response.message?.message;
      if (isProtocolV2LinkDisabledFailure(failureCode, firmwareMessage)) {
        throw createProtocolV2LinkDisabledError(failureCode, firmwareMessage);
      }
    }
    probeError = new Error(`unexpected response type ${response.type}`);
  } catch (error) {
    if (isProtocolV2LinkDisabledError(error) || shouldRethrow?.(error)) {
      throw error;
    }
    probeError = error;
  }

  logger?.debug?.(`[${logPrefix}] Protocol V2 probe failed:`, getErrorMessage(probeError));
  await onProbeFailed?.(probeError);
  return false;
}
