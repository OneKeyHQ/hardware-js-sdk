import {
  ArtifactReaderByteSource,
  FirmwareHostBindingRegistry,
  FirmwareUpdateErrorCode,
  MAX_FIRMWARE_ARTIFACT_READ_LENGTH,
  MemoryByteSource,
  openFirmwareArtifactByteSource,
  openFirmwareArtifactReader,
} from '../../src/firmware-update';

import type {
  FirmwareArtifactReader,
  FirmwareArtifactReceipt,
  FirmwareUpdateHostBinding,
} from '../../src/firmware-update';

const createBinding = (artifactReader: FirmwareArtifactReader): FirmwareUpdateHostBinding => ({
  artifactReader,
  checkpointSink: {
    commit: jest.fn(() => Promise.resolve()),
  },
});

const createReader = (
  overrides: Partial<FirmwareArtifactReader> = {},
  size = 1024
): FirmwareArtifactReader => ({
  open: jest.fn(() =>
    Promise.resolve({
      readerId: 'reader-byte-source',
      size,
    })
  ),
  read: jest.fn(input =>
    Promise.resolve({
      data: new ArrayBuffer(input.length),
      bytesRead: input.length,
      eof: input.offset + input.length === size,
    })
  ),
  close: jest.fn(() => Promise.resolve()),
  cancel: jest.fn(() => Promise.resolve()),
  ...overrides,
});

const receipt = (size = 1024): FirmwareArtifactReceipt => ({
  artifactId: 'firmware-artifact-1',
  role: 'firmware',
  target: 'firmware',
  artifactRef: 'artifact-ref-1',
  size,
  sha256: 'a'.repeat(64),
  integrity: 'catalog-trusted',
  leaseId: 'lease-1',
  materialization: { kind: 'raw' },
});

const createReaderSource = async (hostReader: FirmwareArtifactReader, size = 1024) => {
  const registry = new FirmwareHostBindingRegistry();
  registry.register(createBinding(hostReader));
  const reader = await openFirmwareArtifactReader(registry, 'artifact-ref-1');
  expect(reader.size).toBe(size);
  return new ArtifactReaderByteSource(reader);
};

describe('firmware byte sources', () => {
  it('bounds reads to 256 KiB and clips the final read to EOF', async () => {
    const size = MAX_FIRMWARE_ARTIFACT_READ_LENGTH + 2;
    const hostReader = createReader({}, size);
    const source = await createReaderSource(hostReader, size);

    await expect(source.readAt(0, MAX_FIRMWARE_ARTIFACT_READ_LENGTH)).resolves.toHaveProperty(
      'byteLength',
      MAX_FIRMWARE_ARTIFACT_READ_LENGTH
    );
    await expect(source.readAt(size - 2, 100)).resolves.toHaveProperty('byteLength', 2);
    expect(hostReader.read).toHaveBeenLastCalledWith(
      expect.objectContaining({
        offset: size - 2,
        length: 2,
      })
    );
    await expect(source.readAt(size, 1)).resolves.toHaveProperty('byteLength', 0);
    await expect(source.readAt(0, MAX_FIRMWARE_ARTIFACT_READ_LENGTH + 1)).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareArtifactReadTooLarge,
    });
    await source.close();
  });

  it.each([
    { offset: -1, length: 1 },
    { offset: 1025, length: 1 },
    { offset: 0, length: 0 },
    { offset: 0.5, length: 1 },
  ])('rejects invalid read request offset=$offset length=$length', async ({ offset, length }) => {
    const source = await createReaderSource(createReader());

    await expect(source.readAt(offset, length)).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareArtifactReadOutOfBounds,
    });
    await source.close();
  });

  it.each([
    {
      name: 'empty non-EOF read',
      result: {
        data: new ArrayBuffer(0),
        bytesRead: 0,
        eof: false,
      },
    },
    {
      name: 'short non-EOF read',
      result: {
        data: new ArrayBuffer(1),
        bytesRead: 1,
        eof: false,
      },
    },
    {
      name: 'inconsistent EOF read',
      result: {
        data: new ArrayBuffer(16),
        bytesRead: 16,
        eof: true,
      },
    },
  ])('rejects $name', async ({ result }) => {
    const source = await createReaderSource(
      createReader({
        read: jest.fn(() => Promise.resolve(result)),
      })
    );

    await expect(source.readAt(0, 16)).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid,
    });
    await source.close();
  });

  it('provides a bounded legacy memory source without cross-process resume', async () => {
    const bytes = Uint8Array.from({ length: 32 }, (_value, index) => index);
    const source = new MemoryByteSource(bytes.buffer);

    expect(source.supportsCrossProcessResume).toBe(false);
    await expect(source.readAt(8, 4)).resolves.toEqual(Uint8Array.from([8, 9, 10, 11]).buffer);
    await source.close();
    await expect(source.readAt(0, 1)).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid,
    });
  });

  it('rejects an opened size that differs from the receipt and closes the reader', async () => {
    const registry = new FirmwareHostBindingRegistry();
    const hostReader = createReader({}, 2048);
    registry.register(createBinding(hostReader));

    await expect(openFirmwareArtifactByteSource(registry, receipt(1024))).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareArtifactReceiptMismatch,
    });
    expect(hostReader.close).toHaveBeenCalledTimes(1);
  });
});
