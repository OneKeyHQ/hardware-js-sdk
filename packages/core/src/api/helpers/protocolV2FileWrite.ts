import {
  PROTOCOL_V2_BLE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DataManager } from '../../data-manager';

import type { DeviceCommands } from '../../device/DeviceCommands';

export type ProtocolV2FileWriteData = ArrayBuffer | Uint8Array | Blob | string;

export type ProtocolV2FileWriteProgress = {
  progress: number;
  transferredBytes: number;
  totalBytes: number;
  rateBytesPerSecond?: number;
  elapsedMs: number;
};

export type ProtocolV2FileWriteOptions = {
  commands: Pick<DeviceCommands, 'typedCall'>;
  path: string;
  data: ProtocolV2FileWriteData;
  offset?: number;
  totalSize?: number;
  chunkSize?: number;
  chunkLen?: number;
  overwrite?: boolean;
  append?: boolean;
  uiPercentage?: number;
  timeoutMs?: number;
  maxChunkRetries?: number;
  paceMs?: number;
  throwIfAborted?: () => void;
  onProgress?: (progress: ProtocolV2FileWriteProgress) => void;
};

const MIN_FILE_CHUNK_SIZE = 64;

export function isProtocolV2ResponseTimeout(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { errorCode?: number; code?: number | string; message?: string };
  const code = candidate.errorCode ?? candidate.code;
  return (
    code === HardwareErrorCode.BleTimeoutError ||
    code === 'response-timeout' ||
    /(?:BLE|Lowlevel|Protocol V2) response timeout/i.test(candidate.message ?? '')
  );
}

function getProtocolV2FileChunkLimit() {
  const env = DataManager.getSettings('env');
  return env && DataManager.isBleConnect(env)
    ? PROTOCOL_V2_BLE_FILE_CHUNK_SIZE
    : PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE;
}

async function dataToUint8Array(data: ProtocolV2FileWriteData): Promise<Uint8Array> {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }
  throw ERRORS.TypedError(
    HardwareErrorCode.CallMethodInvalidParameter,
    'Unsupported FilesystemFileWrite data'
  );
}

function normalizeChunkSize(value: unknown, maxChunkSize: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return maxChunkSize;
  return Math.min(Math.max(Math.floor(numeric), MIN_FILE_CHUNK_SIZE), maxChunkSize);
}

function getDeviceTransferProgress(before: number, after: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return 100;
  if (before <= 0 && after < total) return 0;
  if (after >= total) return 100;
  return Math.min(Math.max(Math.ceil((after / total) * 100), 1), 99);
}

function getConfirmedProgress(processed: number, total: number, written: number, length: number) {
  if (Number.isFinite(processed) && Number.isFinite(total) && total > 0) {
    if (processed >= total) return 100;
    return Math.min(Math.max(Math.floor((processed / total) * 100), 0), 99);
  }
  if (length > 0) return written >= length ? 100 : Math.floor((written / length) * 100);
  return 100;
}

export async function writeProtocolV2File(options: ProtocolV2FileWriteOptions) {
  options.throwIfAborted?.();
  const data = await dataToUint8Array(options.data);
  const dataLength = data.byteLength;
  const startOffset =
    Number.isFinite(options.offset) && Number(options.offset) > 0 ? Number(options.offset) : 0;
  const totalSize =
    Number.isFinite(options.totalSize) && Number(options.totalSize) > 0
      ? Number(options.totalSize)
      : startOffset + dataLength;

  if (totalSize < startOffset + dataLength) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `FilesystemFileWrite totalSize ${totalSize} is smaller than offset + data length ${
        startOffset + dataLength
      }`
    );
  }

  const chunkSize = normalizeChunkSize(
    options.chunkSize ?? options.chunkLen,
    getProtocolV2FileChunkLimit()
  );
  let written = 0;
  let chunks = 0;
  let lastMessage: Record<string, unknown> | undefined;
  const startTime = Date.now();

  while (written < dataLength) {
    options.throwIfAborted?.();
    const chunk = data.slice(written, Math.min(written + chunkSize, dataLength));
    const offset = startOffset + written;
    const progress =
      options.uiPercentage ??
      getDeviceTransferProgress(offset, offset + chunk.byteLength, totalSize);
    const request = {
      file: { path: options.path, offset, total_size: totalSize, data: chunk },
      overwrite: chunks === 0 ? options.overwrite ?? false : false,
      append: options.append ?? false,
      ui_percentage: progress,
    };
    const maxChunkRetries = Math.max(Math.floor(options.maxChunkRetries ?? 0), 0);
    let retryCount = 0;
    let response;
    let isWritePending = true;
    while (isWritePending) {
      try {
        response = await options.commands.typedCall(
          'FilesystemFileWrite',
          'FilesystemFile',
          request,
          { timeoutMs: options.timeoutMs }
        );
        isWritePending = false;
      } catch (error) {
        if (retryCount >= maxChunkRetries || !isProtocolV2ResponseTimeout(error)) throw error;
        retryCount += 1;
        options.throwIfAborted?.();
      }
    }
    if (!response) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'FilesystemFileWrite completed without a response'
      );
    }
    options.throwIfAborted?.();
    lastMessage = response.message;
    const rawProcessedByte = response.message?.processed_byte;
    const processedByte = Number(rawProcessedByte);
    if (
      rawProcessedByte !== undefined &&
      (!Number.isFinite(processedByte) ||
        processedByte <= offset ||
        processedByte > offset + chunk.byteLength)
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `FilesystemFileWrite invalid processed_byte ${processedByte}`
      );
    }
    written =
      rawProcessedByte === undefined ? written + chunk.byteLength : processedByte - startOffset;
    chunks += 1;
    const elapsedMs = Date.now() - startTime;
    const transferredBytes = Math.min(written, dataLength);
    options.onProgress?.({
      progress: getConfirmedProgress(startOffset + written, totalSize, written, dataLength),
      transferredBytes,
      totalBytes: dataLength,
      rateBytesPerSecond:
        elapsedMs > 0 ? Math.round((transferredBytes / elapsedMs) * 1000) : undefined,
      elapsedMs,
    });
    if (options.paceMs && options.paceMs > 0) {
      await new Promise(resolve => {
        setTimeout(resolve, options.paceMs);
      });
    }
  }

  return {
    ...lastMessage,
    path: options.path,
    offset: startOffset,
    total_size: totalSize,
    processed_byte: startOffset + written,
    chunks,
  };
}
