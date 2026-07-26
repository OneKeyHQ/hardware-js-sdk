import { assertFirmwareByteSourceReadRequest } from './byteSource';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';

import type { FirmwareByteSource } from './byteSource';

const createClosedMemorySourceError = () =>
  createFirmwareUpdateError(
    FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid,
    'Memory firmware byte source is closed'
  );

export class MemoryByteSource implements FirmwareByteSource {
  readonly size: number;

  readonly supportsCrossProcessResume = false;

  private bytes: Uint8Array | null;

  constructor(buffer: ArrayBuffer) {
    this.bytes = new Uint8Array(buffer);
    this.size = buffer.byteLength;
  }

  readAt(offset: number, length: number): Promise<ArrayBuffer> {
    if (!this.bytes) {
      return Promise.reject(createClosedMemorySourceError());
    }
    assertFirmwareByteSourceReadRequest(this.size, offset, length);
    if (offset === this.size) {
      return Promise.resolve(new ArrayBuffer(0));
    }
    const end = Math.min(offset + length, this.size);
    return Promise.resolve(this.bytes.slice(offset, end).buffer);
  }

  cancel(_operationId: string): Promise<void> {
    // Memory reads complete synchronously and cannot be resumed across runtimes.
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.bytes = null;
    return Promise.resolve();
  }
}
