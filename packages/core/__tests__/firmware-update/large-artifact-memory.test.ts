import {
  MAX_FIRMWARE_ARTIFACT_READ_LENGTH,
  writeFirmwareByteSource,
} from '../../src/firmware-update';

import type { FirmwareByteSource } from '../../src/firmware-update';

const LARGE_FIRMWARE_FIXTURE_SIZE = 83_854_948;

class VirtualFirmwareByteSource implements FirmwareByteSource {
  readonly size = LARGE_FIRMWARE_FIXTURE_SIZE;

  readonly supportsCrossProcessResume = true;

  maxReadLength = 0;

  totalRead = 0;

  activeReads = 0;

  maxActiveReads = 0;

  async readAt(offset: number, length: number): Promise<ArrayBuffer> {
    expect(offset).toBe(this.totalRead);
    this.activeReads += 1;
    this.maxActiveReads = Math.max(this.maxActiveReads, this.activeReads);
    this.maxReadLength = Math.max(this.maxReadLength, length);
    try {
      await Promise.resolve();
      this.totalRead += length;
      return new Uint8Array(length).buffer;
    } finally {
      this.activeReads -= 1;
    }
  }

  cancel(_operationId: string): Promise<void> {
    return Promise.resolve();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

describe('large firmware artifact streaming', () => {
  it('streams 83,854,948 bytes with one bounded read in flight', async () => {
    const source = new VirtualFirmwareByteSource();
    let totalWritten = 0;

    await expect(
      writeFirmwareByteSource({
        source,
        chunkSize: MAX_FIRMWARE_ARTIFACT_READ_LENGTH,
        writeChunk: async ({ data, length, sourceOffset }) => {
          expect(data.byteLength).toBeLessThanOrEqual(MAX_FIRMWARE_ARTIFACT_READ_LENGTH);
          expect(sourceOffset).toBe(totalWritten);
          totalWritten += length;
          await Promise.resolve();
          return length;
        },
      })
    ).resolves.toBe(LARGE_FIRMWARE_FIXTURE_SIZE);

    expect(source.maxReadLength).toBe(MAX_FIRMWARE_ARTIFACT_READ_LENGTH);
    expect(source.maxActiveReads).toBe(1);
    expect(source.totalRead).toBe(LARGE_FIRMWARE_FIXTURE_SIZE);
    expect(totalWritten).toBe(LARGE_FIRMWARE_FIXTURE_SIZE);
  });
});
