import { PROTOCOL_V2_PACKET_SRC_COMMAND } from '../../constants';
import { ProtocolV2FrameAssembler, concatUint8Arrays } from './frame-assembler';
import { ProtocolV2 } from '..';
import * as check from '../../utils/highlevel-checks';

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
      const frame = ProtocolV2.encodeFrame(schemas, name, data, {
        packetSrc,
        router,
      });
      const expectedSeq = frame[6];

      logger?.debug?.(
        `[${logPrefix}] TX frame name=${name} len=${frame.length} router=${frame[4]} attr=${
          frame[5]
        } seq=${expectedSeq} hex=${bytesToDebugHex(frame)}`
      );

      await writeFrame(frame);

      // Some Protocol V2 operations emit progress notifications before the
      // terminal response. Consume those frames here so callers still see a
      // request/terminal-response shaped API.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const rxFrame = await readFrame();
        logger?.debug?.(
          `[${logPrefix}] RX frame len=${rxFrame.length} router=${rxFrame[4]} attr=${
            rxFrame[5]
          } seq=${rxFrame[6]} hex=${bytesToDebugHex(rxFrame)}`
        );
        const decoded = ProtocolV2.decodeFrame(schemas, rxFrame);
        if (decoded.seq !== expectedSeq) {
          logger?.debug?.(
            `[${logPrefix}] seq differs for ${name}: tx=${expectedSeq}, rx=${decoded.seq}`
          );
        }
        logger?.debug?.(
          `[${logPrefix}] TX name=${name} seq=${expectedSeq} | RX seq=${decoded.seq} msgType=${decoded.msgType} pbPayload=${decoded.pbPayload.length}B`
        );

        const response = check.call(decoded);
        if (callOptions.intermediateTypes?.includes(response.type)) {
          callOptions.onIntermediateResponse?.(response);
        } else {
          return response;
        }
      }
    };

    return withProtocolTimeout(callPromise(), callOptions.timeoutMs, () =>
      createTimeoutError
        ? createTimeoutError(name, callOptions.timeoutMs ?? 0)
        : new Error(`Protocol V2 response timeout after ${callOptions.timeoutMs}ms for ${name}`)
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
  try {
    await onBeforeProbe?.();
    const response = await call('GetProtoVersion', {}, { timeoutMs });
    return response.type === 'ProtoVersion';
  } catch (versionError) {
    logger?.debug?.(
      `[${logPrefix}] Protocol V2 version probe failed:`,
      getErrorMessage(versionError)
    );
    try {
      const response = await call('DevGetFirmwareUpdateStatus', {}, { timeoutMs });
      return response.type === 'DevFirmwareUpdateStatus';
    } catch (bootloaderError) {
      logger?.debug?.(
        `[${logPrefix}] Protocol V2 bootloader probe failed:`,
        getErrorMessage(bootloaderError)
      );
      await onProbeFailed?.(bootloaderError);
      return false;
    }
  }
}
