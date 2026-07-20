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

const HIGH_VOLUME_PROTOCOL_V2_CALLS = new Set([
  ...LogBlockCommand,
  'FilesystemFileRead',
  'FileRead',
  'EmmcFileRead',
]);

function shouldReduceProtocolV2Debug(name: string) {
  return HIGH_VOLUME_PROTOCOL_V2_CALLS.has(name);
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
    });
    // 暂停输出 Protocol V2 TX 帧日志，避免传输层产生大量调试信息。
    /*
    const txMetadata = ProtocolV2.inspectFrame(schemas, frame);

    if (!shouldReduceDebug) {
      logger?.debug?.(`[${logPrefix}] TX`, {
        method: name,
        type: name,
        typeId: txMetadata.messageTypeId,
        seq: txMetadata.seq,
        bytes: frame.length,
      });
    }
    */

    if (maxFrameBytes !== undefined && frame.length > maxFrameBytes) {
      throw new Error(
        `Protocol V2 frame too large for transport: ${frame.length} > ${maxFrameBytes}`
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
        const isAck = ProtocolV2.isAckFrame(rxFrame);
        if (!isAck) {
          // 暂停输出 Protocol V2 RX 帧日志，避免传输层产生大量调试信息。
          /*
          const rxMetadata = ProtocolV2.inspectFrame(schemas, rxFrame);

          if (!shouldReduceDebug) {
            logger?.debug?.(`[${logPrefix}] RX`, {
              method: name,
              type: rxMetadata.type,
              typeId: rxMetadata.messageTypeId,
              seq: rxMetadata.seq,
              bytes: rxFrame.length,
            });
          }
          */

          const decoded = ProtocolV2.decodeFrame(schemas, rxFrame);

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
