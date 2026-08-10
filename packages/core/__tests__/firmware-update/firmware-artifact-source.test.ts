import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import {
  MAX_FIRMWARE_ARTIFACT_READ_BYTES,
  openFirmwareByteSource,
  writeFirmwareByteSource,
} from '../../src/api/firmware/FirmwareArtifactSource';

import type { FirmwareArtifactReader } from '../../src/types/api/firmwareUpdate';

const artifactBytes = Uint8Array.from([1, 2, 3, 4, 5, 6]);
const artifact = {
  artifactRef: `fw:${'a'.repeat(64)}`,
  size: artifactBytes.byteLength,
  sha256: bytesToHex(sha256(artifactBytes)),
};

const createReader = (bytes = artifactBytes) => {
  const open = jest.fn(() => Promise.resolve({ readerId: 'reader-1', size: bytes.byteLength }));
  const read = jest.fn(({ offset, length }: { readerId: string; offset: number; length: number }) =>
    Promise.resolve({
      data: bytes.slice(offset, offset + length).buffer,
      bytesRead: length,
      eof: offset + length === bytes.byteLength,
    })
  );
  const close = jest.fn(() => Promise.resolve());
  const reader: FirmwareArtifactReader = { open, read, close };
  return { reader, open, read, close };
};

describe('FirmwareArtifactSource', () => {
  it('materializes verified bytes before exposing the source', async () => {
    const backingBytes = Uint8Array.from(artifactBytes);
    const { reader, read, close } = createReader(backingBytes);
    const source = await openFirmwareByteSource({ artifact, reader });
    if (!source) {
      throw new Error('Expected a firmware byte source');
    }
    expect(read).toHaveBeenCalledWith({ readerId: 'reader-1', offset: 0, length: artifact.size });
    expect(close).toHaveBeenCalledWith({ readerId: 'reader-1' });

    backingBytes.fill(9);
    read.mockClear();

    const writes: Array<{ offset: number; data: number[] }> = [];
    await writeFirmwareByteSource({
      source,
      chunkSize: 4,
      write: ({ data, sourceOffset, length }) => {
        writes.push({
          offset: sourceOffset,
          data: Array.from(new Uint8Array(data)),
        });
        return Promise.resolve(length);
      },
    });
    await source.close();

    expect(writes).toEqual([
      { offset: 0, data: [1, 2, 3, 4] },
      { offset: 4, data: [5, 6] },
    ]);
    expect(read).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('rejects same-sized bytes that do not match the receipt digest', async () => {
    const { reader, close } = createReader(Uint8Array.from([6, 5, 4, 3, 2, 1]));

    await expect(openFirmwareByteSource({ artifact, reader })).rejects.toMatchObject({
      params: {
        firmwareUpdateCode: 'FirmwareArtifactReceiptMismatch',
      },
    });
    expect(close).toHaveBeenCalledWith({ readerId: 'reader-1' });
  });

  it('verifies large artifacts through bounded sequential reads', async () => {
    const bytes = new Uint8Array(MAX_FIRMWARE_ARTIFACT_READ_BYTES + 3);
    bytes.fill(7);
    const largeArtifact = {
      ...artifact,
      size: bytes.byteLength,
      sha256: bytesToHex(sha256(bytes)),
    };
    const { reader, read } = createReader(bytes);

    const source = await openFirmwareByteSource({ artifact: largeArtifact, reader });
    if (!source) {
      throw new Error('Expected a firmware byte source');
    }
    expect(read.mock.calls.map(([request]) => request)).toEqual([
      {
        readerId: 'reader-1',
        offset: 0,
        length: MAX_FIRMWARE_ARTIFACT_READ_BYTES,
      },
      {
        readerId: 'reader-1',
        offset: MAX_FIRMWARE_ARTIFACT_READ_BYTES,
        length: 3,
      },
    ]);
    await source.close();
  });

  it('rejects a reader whose opened size differs from the receipt', async () => {
    const { reader, open, close } = createReader();
    open.mockResolvedValue({
      readerId: 'reader-1',
      size: artifact.size + 1,
    });

    await expect(openFirmwareByteSource({ artifact, reader })).rejects.toMatchObject({
      params: {
        firmwareUpdateCode: 'FirmwareArtifactReceiptMismatch',
      },
    });
    expect(close).toHaveBeenCalledWith({ readerId: 'reader-1' });
  });

  it('rejects paths and over-limit writes before invoking the host again', async () => {
    const { reader, read } = createReader();
    await expect(
      openFirmwareByteSource({
        artifact: { ...artifact, artifactRef: '/tmp/firmware.bin' },
        reader,
      })
    ).rejects.toMatchObject({
      params: {
        firmwareUpdateCode: 'FirmwareArtifactReceiptMismatch',
      },
    });

    const source = await openFirmwareByteSource({ artifact, reader });
    if (!source) {
      throw new Error('Expected a firmware byte source');
    }
    read.mockClear();
    await expect(
      writeFirmwareByteSource({
        source,
        chunkSize: MAX_FIRMWARE_ARTIFACT_READ_BYTES + 1,
        write: ({ length }) => Promise.resolve(length),
      })
    ).rejects.toMatchObject({
      params: {
        firmwareUpdateCode: 'FirmwareArtifactReadTooLarge',
      },
    });
    expect(read).not.toHaveBeenCalled();
    await source.close();
  });

  it('closes stale readers when open returns invalid metadata', async () => {
    const { reader, open, close } = createReader();
    open.mockResolvedValue({
      readerId: '',
      size: artifact.size,
    });

    await expect(openFirmwareByteSource({ artifact, reader })).rejects.toMatchObject({
      params: {
        firmwareUpdateCode: 'FirmwareArtifactReceiptMismatch',
      },
    });
    expect(close).not.toHaveBeenCalled();
  });
});
