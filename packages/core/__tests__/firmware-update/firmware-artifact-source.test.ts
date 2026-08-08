import {
  MAX_FIRMWARE_ARTIFACT_READ_BYTES,
  openFirmwareByteSource,
  writeFirmwareByteSource,
} from '../../src/api/firmware/FirmwareArtifactSource';

import type { FirmwareArtifactReader } from '../../src/types/api/firmwareUpdate';

const artifact = {
  artifactRef: `fw:${'a'.repeat(64)}`,
  size: 6,
  sha256: 'b'.repeat(64),
};

const createReader = () => {
  const open = jest.fn(() => Promise.resolve({ readerId: 'reader-1', size: artifact.size }));
  const read = jest.fn(({ offset, length }: { readerId: string; offset: number; length: number }) =>
    Promise.resolve({
      data: Uint8Array.from([1, 2, 3, 4, 5, 6]).slice(offset, offset + length).buffer,
      bytesRead: length,
      eof: offset + length === artifact.size,
    })
  );
  const close = jest.fn(() => Promise.resolve());
  const reader: FirmwareArtifactReader = { open, read, close };
  return { reader, open, read, close };
};

describe('FirmwareArtifactSource', () => {
  it('reads an opaque artifact through bounded sequential reads', async () => {
    const { reader, close } = createReader();
    const source = await openFirmwareByteSource({ artifact, reader });
    if (!source) {
      throw new Error('Expected a firmware byte source');
    }

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
    expect(close).toHaveBeenCalledWith({ readerId: 'reader-1' });
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

  it('rejects paths and over-limit reads before invoking the host', async () => {
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
