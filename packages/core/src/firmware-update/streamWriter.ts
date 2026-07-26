import {
  MAX_FIRMWARE_ARTIFACT_READ_LENGTH,
  assertFirmwareByteSourceReadRequest,
} from './byteSource';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';

import type { FirmwareByteSource } from './byteSource';

export interface FirmwareStreamWriteChunk {
  data: ArrayBuffer;
  length: number;
  sourceOffset: number;
  targetOffset: number;
  isFirstChunk: boolean;
  completedAfterChunk: number;
  total: number;
}

export interface FirmwareStreamWriterOptions {
  source: FirmwareByteSource;
  chunkSize: number;
  writeChunk(chunk: FirmwareStreamWriteChunk): Promise<number>;
  reportProgress?(completed: number, total: number): void | Promise<void>;
}

const streamError = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareTransactionConflict, detail, {
    detail,
  });
};

export const writeFirmwareByteSource = async ({
  source,
  chunkSize,
  writeChunk,
  reportProgress,
}: FirmwareStreamWriterOptions): Promise<number> => {
  if (
    !Number.isSafeInteger(chunkSize) ||
    chunkSize <= 0 ||
    chunkSize > MAX_FIRMWARE_ARTIFACT_READ_LENGTH
  ) {
    return streamError(
      `Firmware stream chunkSize must be between 1 and ${MAX_FIRMWARE_ARTIFACT_READ_LENGTH}`
    );
  }
  let sourceOffset = 0;
  let targetOffset = 0;
  while (sourceOffset < source.size) {
    const length = Math.min(chunkSize, source.size - sourceOffset);
    assertFirmwareByteSourceReadRequest(source.size, sourceOffset, length);
    const data = await source.readAt(sourceOffset, length);
    if (data.byteLength !== length) {
      return streamError(
        `Firmware stream read ${data.byteLength} bytes at ${sourceOffset}, expected ${length}`
      );
    }
    const processedBytes = await writeChunk({
      data,
      length,
      sourceOffset,
      targetOffset,
      isFirstChunk: sourceOffset === 0,
      completedAfterChunk: sourceOffset + length,
      total: source.size,
    });
    if (processedBytes !== length) {
      return streamError(
        `Firmware stream writer processed ${processedBytes} bytes, expected ${length}`
      );
    }
    sourceOffset += length;
    targetOffset += processedBytes;
    await reportProgress?.(sourceOffset, source.size);
  }
  return targetOffset;
};
