import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';

import type {
  FirmwareArtifactReader,
  FirmwareArtifactReaderReadInput,
  FirmwareArtifactReaderReadResult,
} from './contracts';
import type {
  FirmwareHostBindingRegistry,
  FirmwareHostBindingSnapshot,
} from './hostBindingRegistry';

const invalidReader = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid, detail, {
    detail,
  });
};

const validateOpenResult = (
  value: Awaited<ReturnType<FirmwareArtifactReader['open']>>
): Awaited<ReturnType<FirmwareArtifactReader['open']>> => {
  if (typeof value?.readerId !== 'string' || value.readerId.length === 0) {
    return invalidReader('Firmware artifact reader returned an invalid readerId');
  }
  if (!Number.isSafeInteger(value.size) || value.size <= 0) {
    return invalidReader('Firmware artifact reader returned an invalid size');
  }
  return value;
};

export class FirmwareArtifactReaderSession {
  readonly readerId: string;

  readonly size: number;

  private activeOperationId: string | null = null;

  private closed = false;

  constructor(
    private readonly reader: FirmwareArtifactReader,
    readerId: string,
    size: number,
    private readonly generation: number,
    private readonly registry: FirmwareHostBindingRegistry
  ) {
    this.readerId = readerId;
    this.size = size;
  }

  private assertReadable(): void {
    if (this.closed) {
      invalidReader(`Firmware artifact reader ${this.readerId} is closed`);
    }
    this.registry.assertCurrent(this.generation);
  }

  async read(
    input: Omit<FirmwareArtifactReaderReadInput, 'readerId'>
  ): Promise<FirmwareArtifactReaderReadResult> {
    this.assertReadable();
    if (typeof input.operationId !== 'string' || input.operationId.length === 0) {
      return invalidReader('Firmware artifact read requires a non-empty operationId');
    }
    if (this.activeOperationId) {
      return invalidReader(
        `Firmware artifact reader ${this.readerId} already has in-flight operation ${this.activeOperationId}`
      );
    }
    this.activeOperationId = input.operationId;
    try {
      const result = await this.reader.read({
        ...input,
        readerId: this.readerId,
      });
      this.registry.assertCurrent(this.generation);
      return result;
    } finally {
      this.activeOperationId = null;
    }
  }

  async cancel(operationId: string): Promise<void> {
    this.assertReadable();
    if (this.activeOperationId !== operationId) {
      return invalidReader(`Firmware artifact operation ${operationId} is not active`);
    }
    await this.reader.cancel({ operationId });
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    await this.reader.close({ readerId: this.readerId });
  }
}

const closeStaleOpenResult = async (
  snapshot: FirmwareHostBindingSnapshot,
  readerId: string
): Promise<void> => {
  try {
    await snapshot.binding.artifactReader.close({ readerId });
  } catch {
    // Preserve the stale-generation error; close is best-effort on an invalidated host.
  }
};

export const openFirmwareArtifactReader = async (
  registry: FirmwareHostBindingRegistry,
  artifactRef: string
): Promise<FirmwareArtifactReaderSession> => {
  if (typeof artifactRef !== 'string' || artifactRef.length === 0) {
    return invalidReader('Firmware artifactRef must be a non-empty opaque identifier');
  }
  const snapshot = registry.capture();
  const openResult = validateOpenResult(
    await snapshot.binding.artifactReader.open({
      artifactRef,
    })
  );
  try {
    registry.assertCurrent(snapshot.generation);
  } catch (error) {
    await closeStaleOpenResult(snapshot, openResult.readerId);
    throw error;
  }
  return new FirmwareArtifactReaderSession(
    snapshot.binding.artifactReader,
    openResult.readerId,
    openResult.size,
    snapshot.generation,
    registry
  );
};
