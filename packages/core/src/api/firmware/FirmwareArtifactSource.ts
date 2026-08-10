import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import type {
  FirmwareArtifactReader,
  FirmwareArtifactReference,
} from '../../types/api/firmwareUpdate';

export const MAX_FIRMWARE_ARTIFACT_READ_BYTES = 256 * 1024;

export interface FirmwareByteSource {
  readonly size: number;
  readAt(offset: number, length: number): Promise<ArrayBuffer>;
  close(): Promise<void>;
}

const artifactError = (
  code:
    | 'FirmwareArtifactReceiptMismatch'
    | 'FirmwareArtifactReaderInvalid'
    | 'FirmwareArtifactReadOutOfBounds'
    | 'FirmwareArtifactReadTooLarge',
  message: string
): never => {
  throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, message, {
    firmwareUpdateCode: code,
  });
};

const assertSafeSize = (value: number, name: string) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    artifactError('FirmwareArtifactReceiptMismatch', `${name} must be a positive safe integer`);
  }
};

export const assertFirmwareArtifactReference = (
  artifact: FirmwareArtifactReference
): FirmwareArtifactReference => {
  if (
    !artifact ||
    typeof artifact.artifactRef !== 'string' ||
    artifact.artifactRef.length === 0 ||
    artifact.artifactRef.length > 160 ||
    artifact.artifactRef.includes('/') ||
    artifact.artifactRef.includes('\\')
  ) {
    artifactError(
      'FirmwareArtifactReceiptMismatch',
      'Firmware artifactRef must be an opaque identifier'
    );
  }
  assertSafeSize(artifact.size, 'Firmware artifact size');
  if (typeof artifact.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(artifact.sha256)) {
    artifactError(
      'FirmwareArtifactReceiptMismatch',
      'Firmware artifact sha256 must be a 32-byte hexadecimal digest'
    );
  }
  return artifact;
};

const assertFirmwareArtifactRead = (size: number, offset: number, length: number) => {
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset >= size ||
    !Number.isSafeInteger(length) ||
    length <= 0 ||
    offset + length > size
  ) {
    artifactError(
      'FirmwareArtifactReadOutOfBounds',
      `Firmware artifact read is outside size ${size}: offset=${offset}, length=${length}`
    );
  }
  if (length > MAX_FIRMWARE_ARTIFACT_READ_BYTES) {
    artifactError(
      'FirmwareArtifactReadTooLarge',
      `Firmware artifact read length ${length} exceeds ${MAX_FIRMWARE_ARTIFACT_READ_BYTES}`
    );
  }
};

const createMemoryFirmwareByteSource = (binary: ArrayBuffer): FirmwareByteSource => {
  let bytes: Uint8Array | null = new Uint8Array(binary);
  const { byteLength: size } = binary;
  assertSafeSize(size, 'Firmware binary size');
  return {
    size,
    readAt: (offset, length) => {
      if (!bytes) {
        return Promise.reject(
          ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Firmware byte source is closed', {
            firmwareUpdateCode: 'FirmwareArtifactReaderInvalid',
          })
        );
      }
      assertFirmwareArtifactRead(size, offset, length);
      return Promise.resolve(bytes.slice(offset, offset + length).buffer);
    },
    close: () => {
      bytes = null;
      return Promise.resolve();
    },
  };
};

class ReaderFirmwareByteSource implements FirmwareByteSource {
  readonly size: number;

  private closed = false;

  private reading = false;

  private constructor(
    private readonly reader: FirmwareArtifactReader,
    private readonly readerId: string,
    size: number
  ) {
    this.size = size;
  }

  static async open(
    artifact: FirmwareArtifactReference,
    reader: FirmwareArtifactReader
  ): Promise<ReaderFirmwareByteSource> {
    const opened = await reader.open({ artifactRef: artifact.artifactRef });
    if (
      !opened ||
      typeof opened.readerId !== 'string' ||
      opened.readerId.length === 0 ||
      !Number.isSafeInteger(opened.size) ||
      opened.size !== artifact.size
    ) {
      if (opened?.readerId) {
        await reader.close({ readerId: opened.readerId }).catch(() => undefined);
      }
      return artifactError(
        'FirmwareArtifactReceiptMismatch',
        `Firmware artifact opened with size ${opened?.size ?? 'unknown'}, expected ${artifact.size}`
      );
    }
    return new ReaderFirmwareByteSource(reader, opened.readerId, opened.size);
  }

  async readAt(offset: number, length: number): Promise<ArrayBuffer> {
    if (this.closed) {
      return artifactError('FirmwareArtifactReaderInvalid', 'Firmware artifact reader is closed');
    }
    if (this.reading) {
      return artifactError(
        'FirmwareArtifactReaderInvalid',
        'Firmware artifact reader only permits one in-flight read'
      );
    }
    assertFirmwareArtifactRead(this.size, offset, length);
    this.reading = true;
    try {
      const result = await this.reader.read({
        readerId: this.readerId,
        offset,
        length,
      });
      const expectedEof = offset + length === this.size;
      if (
        !result ||
        !(result.data instanceof ArrayBuffer) ||
        result.data.byteLength !== length ||
        result.bytesRead !== length ||
        result.eof !== expectedEof
      ) {
        return artifactError(
          'FirmwareArtifactReaderInvalid',
          'Firmware artifact reader returned an invalid read result'
        );
      }
      return result.data;
    } finally {
      this.reading = false;
    }
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    await this.reader.close({ readerId: this.readerId });
  }
}

export const readFirmwareByteSourceFully = async (
  source: FirmwareByteSource
): Promise<ArrayBuffer> => {
  const output = new Uint8Array(source.size);
  let offset = 0;
  while (offset < source.size) {
    const length = Math.min(MAX_FIRMWARE_ARTIFACT_READ_BYTES, source.size - offset);
    output.set(new Uint8Array(await source.readAt(offset, length)), offset);
    offset += length;
  }
  return output.buffer;
};

export const readVerifiedFirmwareArtifact = async ({
  artifact,
  reader,
}: {
  artifact: FirmwareArtifactReference;
  reader: FirmwareArtifactReader;
}): Promise<ArrayBuffer> => {
  assertFirmwareArtifactReference(artifact);
  const source = await ReaderFirmwareByteSource.open(artifact, reader);
  try {
    const binary = await readFirmwareByteSourceFully(source);
    const actualSha256 = bytesToHex(sha256(new Uint8Array(binary)));
    if (actualSha256 !== artifact.sha256.toLowerCase()) {
      return artifactError(
        'FirmwareArtifactReceiptMismatch',
        'Firmware artifact bytes do not match the approved SHA-256 receipt'
      );
    }
    return binary;
  } finally {
    await source.close().catch(() => undefined);
  }
};

export const openFirmwareByteSource = async ({
  binary,
  artifact,
  reader,
}: {
  binary?: ArrayBuffer;
  artifact?: FirmwareArtifactReference;
  reader?: FirmwareArtifactReader;
}): Promise<FirmwareByteSource | null> => {
  if (binary && artifact) {
    return artifactError(
      'FirmwareArtifactReceiptMismatch',
      'Firmware input must not contain both binary and artifactRef'
    );
  }
  if (binary) {
    return createMemoryFirmwareByteSource(binary);
  }
  if (!artifact) {
    return null;
  }
  assertFirmwareArtifactReference(artifact);
  if (!reader) {
    return artifactError(
      'FirmwareArtifactReaderInvalid',
      'Firmware artifact reader is required for artifactRef input'
    );
  }
  const verifiedBinary = await readVerifiedFirmwareArtifact({ artifact, reader });
  return createMemoryFirmwareByteSource(verifiedBinary);
};

export const writeFirmwareByteSource = async ({
  source,
  chunkSize,
  write,
}: {
  source: FirmwareByteSource;
  chunkSize: number;
  write: (input: {
    data: ArrayBuffer;
    sourceOffset: number;
    length: number;
    first: boolean;
  }) => Promise<number>;
}) => {
  if (
    !Number.isSafeInteger(chunkSize) ||
    chunkSize <= 0 ||
    chunkSize > MAX_FIRMWARE_ARTIFACT_READ_BYTES
  ) {
    return artifactError(
      'FirmwareArtifactReadTooLarge',
      `Firmware artifact chunk size must be between 1 and ${MAX_FIRMWARE_ARTIFACT_READ_BYTES}`
    );
  }
  let offset = 0;
  while (offset < source.size) {
    const length = Math.min(chunkSize, source.size - offset);
    const data = await source.readAt(offset, length);
    const processed = await write({
      data,
      sourceOffset: offset,
      length,
      first: offset === 0,
    });
    if (processed !== length) {
      return artifactError(
        'FirmwareArtifactReaderInvalid',
        `Firmware artifact writer processed ${processed} bytes, expected ${length}`
      );
    }
    offset += length;
  }
  return offset;
};
