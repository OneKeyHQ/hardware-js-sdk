import { openFirmwareArtifactReader } from './artifactReader';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';

import type { FirmwareArtifactReaderSession } from './artifactReader';
import type { FirmwareArtifactReceipt } from './contracts';
import type { FirmwareHostBindingRegistry } from './hostBindingRegistry';

export const MAX_FIRMWARE_ARTIFACT_READ_LENGTH = 256 * 1024;

export interface FirmwareByteSource {
  readonly size: number;
  readonly supportsCrossProcessResume: boolean;
  readAt(offset: number, length: number, operationId?: string): Promise<ArrayBuffer>;
  cancel(operationId: string): Promise<void>;
  close(): Promise<void>;
}

const readerError = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid, detail, {
    detail,
  });
};

const outOfBounds = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareArtifactReadOutOfBounds, detail, {
    detail,
  });
};

const readTooLarge = (length: number): never => {
  throw createFirmwareUpdateError(
    FirmwareUpdateErrorCode.FirmwareArtifactReadTooLarge,
    `Firmware artifact read length ${length} exceeds ${MAX_FIRMWARE_ARTIFACT_READ_LENGTH}`,
    {
      length,
      maximumLength: MAX_FIRMWARE_ARTIFACT_READ_LENGTH,
    }
  );
};

export const assertFirmwareByteSourceReadRequest = (
  size: number,
  offset: number,
  length: number
) => {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > size) {
    outOfBounds(`Firmware artifact read offset ${offset} is outside size ${size}`);
  }
  if (!Number.isSafeInteger(length) || length <= 0) {
    outOfBounds(`Firmware artifact read length ${length} must be a positive safe integer`);
  }
  if (length > MAX_FIRMWARE_ARTIFACT_READ_LENGTH) {
    readTooLarge(length);
  }
};

const validateReadResult = (
  data: ArrayBuffer,
  bytesRead: number,
  eof: boolean,
  offset: number,
  requestedLength: number,
  size: number
): ArrayBuffer => {
  if (!(data instanceof ArrayBuffer)) {
    return readerError('Firmware artifact reader returned non-ArrayBuffer data');
  }
  if (
    !Number.isSafeInteger(bytesRead) ||
    bytesRead < 0 ||
    bytesRead > requestedLength ||
    data.byteLength !== bytesRead
  ) {
    return readerError('Firmware artifact reader returned an invalid byte count');
  }
  const reachedEnd = offset + bytesRead === size;
  if (bytesRead === 0 && !eof) {
    return readerError('Firmware artifact reader returned an empty non-EOF read');
  }
  if (bytesRead < requestedLength && !eof) {
    return readerError('Firmware artifact reader returned a short non-EOF read');
  }
  if (eof !== reachedEnd) {
    return readerError('Firmware artifact reader returned an inconsistent EOF marker');
  }
  return data;
};

export class ArtifactReaderByteSource implements FirmwareByteSource {
  readonly size: number;

  readonly supportsCrossProcessResume = true;

  private operationSequence = 0;

  constructor(private readonly reader: FirmwareArtifactReaderSession) {
    this.size = reader.size;
  }

  async readAt(offset: number, length: number, operationId?: string): Promise<ArrayBuffer> {
    assertFirmwareByteSourceReadRequest(this.size, offset, length);
    if (offset === this.size) {
      return new ArrayBuffer(0);
    }
    const requestedLength = Math.min(length, this.size - offset);
    this.operationSequence += 1;
    const resolvedOperationId =
      operationId ?? `${this.reader.readerId}:read:${this.operationSequence}`;
    const result = await this.reader.read({
      operationId: resolvedOperationId,
      offset,
      length: requestedLength,
    });
    return validateReadResult(
      result.data,
      result.bytesRead,
      result.eof,
      offset,
      requestedLength,
      this.size
    );
  }

  async cancel(operationId: string): Promise<void> {
    await this.reader.cancel(operationId);
  }

  async close(): Promise<void> {
    await this.reader.close();
  }
}

export const openFirmwareArtifactByteSource = async (
  registry: FirmwareHostBindingRegistry,
  receipt: FirmwareArtifactReceipt
): Promise<ArtifactReaderByteSource> => {
  const reader = await openFirmwareArtifactReader(registry, receipt.artifactRef);
  if (reader.size !== receipt.size) {
    await reader.close();
    throw createFirmwareUpdateError(
      FirmwareUpdateErrorCode.FirmwareArtifactReceiptMismatch,
      `Firmware artifact ${receipt.artifactId} opened with size ${reader.size}, expected ${receipt.size}`,
      {
        artifactId: receipt.artifactId,
        openedSize: reader.size,
        receiptSize: receipt.size,
      }
    );
  }
  return new ArtifactReaderByteSource(reader);
};
