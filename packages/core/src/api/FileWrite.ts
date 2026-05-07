import { PROTOCOL_V2_FILE_CHUNK_SIZE } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from './BaseMethod';

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
    let written = 0;
    let chunkIndex = 0;
    let lastMessage: Record<string, unknown> | undefined;

    while (written < dataLength) {
      const chunkEnd = Math.min(written + chunkSize, dataLength);
      const chunk = data.slice(written, chunkEnd);
      const offset = startOffset + written;
      const isFirstChunk = chunkIndex === 0;
      const progress =
        this.params.uiPercentage ??
        Math.min(Math.ceil(((written + chunk.byteLength) / dataLength) * 100), 99);

      const res = await (this.device.commands as any).call('FilesystemFileWrite', {
        file: {
          path: this.params.path,
          offset,
          total_size: totalSize,
          data: chunk,
        },
        overwrite: isFirstChunk ? this.params.overwrite : false,
        append: this.params.append ?? false,
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
