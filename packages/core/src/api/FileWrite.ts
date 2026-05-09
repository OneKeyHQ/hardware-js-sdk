import { PROTOCOL_V2_FILE_CHUNK_SIZE } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from './BaseMethod';
import { UI_REQUEST, createUiMessage } from '../events/ui-request';

export type FileWriteParams = {
  path: string;
  offset?: number;
  totalSize?: number;
  data: ArrayBuffer | Uint8Array | Blob | string;
  chunkSize?: number;
  chunkLen?: number;
  overwrite?: boolean;
  append?: boolean;
  uiPercentage?: number;
};

const MIN_FILE_CHUNK_SIZE = 64;

async function dataToUint8Array(data: FileWriteParams['data'] | Blob): Promise<Uint8Array> {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }

  throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Unsupported FilesystemFileWrite data');
}

function normalizeChunkSize(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return PROTOCOL_V2_FILE_CHUNK_SIZE;
  return Math.min(
    Math.max(Math.floor(numeric), MIN_FILE_CHUNK_SIZE),
    PROTOCOL_V2_FILE_CHUNK_SIZE
  );
}

function getConfirmedProgress(
  processedByte: number,
  totalSize: number,
  written: number,
  dataLength: number
) {
  if (Number.isFinite(processedByte) && Number.isFinite(totalSize) && totalSize > 0) {
    if (processedByte >= totalSize) return 100;
    return Math.min(Math.max(Math.floor((processedByte / totalSize) * 100), 0), 99);
  }
  if (dataLength > 0) {
    if (written >= dataLength) return 100;
    return Math.min(Math.max(Math.floor((written / dataLength) * 100), 0), 99);
  }
  return 100;
}

export default class FileWrite extends BaseMethod<FileWriteParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    const offset = this.payload.offset ?? 0;
    this.params = {
      path: this.payload.path,
      offset,
      totalSize: this.payload.totalSize ?? 0,
      data: this.payload.data,
      chunkSize: this.payload.chunkSize,
      chunkLen: this.payload.chunkLen,
      overwrite: this.payload.overwrite ?? offset === 0,
      append: this.payload.append ?? false,
      uiPercentage: this.payload.uiPercentage,
    };
  }

  async run() {
    const data = await dataToUint8Array(this.params.data as FileWriteParams['data'] | Blob);
    const dataLength = data.byteLength;
    const offsetValue = Number(this.params.offset ?? 0);
    const startOffset = Number.isFinite(offsetValue) && offsetValue > 0 ? offsetValue : 0;
    const payloadTotalSize = Number(this.params.totalSize);
    const totalSize =
      Number.isFinite(payloadTotalSize) && payloadTotalSize > 0
        ? payloadTotalSize
        : startOffset + dataLength;

    if (totalSize < startOffset + dataLength) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `FilesystemFileWrite totalSize ${totalSize} is smaller than offset + data length ${
          startOffset + dataLength
        }`
      );
    }

    const chunkSize = normalizeChunkSize(this.params.chunkSize ?? this.params.chunkLen);
    const overwrite = this.params.overwrite ?? false;
    const append = this.params.append ?? false;
    let written = 0;
    let chunkIndex = 0;
    let lastMessage: Record<string, unknown> | undefined;
    const startTime = Date.now();

    while (written < dataLength) {
      const chunkEnd = Math.min(written + chunkSize, dataLength);
      const chunk = data.slice(written, chunkEnd);
      const offset = startOffset + written;
      const isFirstChunk = chunkIndex === 0;
      const progress =
        this.params.uiPercentage ??
        Math.min(Math.ceil(((written + chunk.byteLength) / dataLength) * 100), 99);

      const res = await this.device.commands.typedCall('FilesystemFileWrite', 'FilesystemFile', {
        file: {
          path: this.params.path,
          offset,
          total_size: totalSize,
          data: chunk,
        },
        overwrite: isFirstChunk ? overwrite : false,
        append,
        ui_percentage: progress,
      });

      lastMessage = res.message;
      const processedByte = Number(res.message?.processed_byte);
      if (Number.isFinite(processedByte) && processedByte > offset) {
        written = processedByte - startOffset;
      } else {
        written += chunk.byteLength;
      }

      if (written > dataLength) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `FilesystemFileWrite invalid processed_byte ${processedByte}`
        );
      }

      const confirmedProcessedByte =
        Number.isFinite(processedByte) && processedByte > offset
          ? processedByte
          : startOffset + written;
      if (typeof this.postMessage === 'function') {
        const elapsedMs = Date.now() - startTime;
        const transferredBytes = Math.min(written, dataLength);
        this.postMessage(
          createUiMessage(UI_REQUEST.DEVICE_PROGRESS, {
            progress: getConfirmedProgress(confirmedProcessedByte, totalSize, written, dataLength),
            transferredBytes,
            totalBytes: dataLength,
            rateBytesPerSecond:
              elapsedMs > 0 ? Math.round((transferredBytes / elapsedMs) * 1000) : undefined,
            elapsedMs,
          })
        );
      }
      chunkIndex += 1;
    }

    return Promise.resolve({
      ...lastMessage,
      path: this.params.path,
      offset: startOffset,
      total_size: totalSize,
      processed_byte: startOffset + written,
      chunks: chunkIndex,
    });
  }
}
