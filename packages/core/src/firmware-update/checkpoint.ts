import { validateFirmwareCheckpoint } from './contracts';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';

import type { FirmwareCheckpoint, FirmwareCheckpointSink } from './contracts';

export const DEFAULT_FIRMWARE_CHECKPOINT_TIMEOUT_MS = 5000;

export interface FirmwareCheckpointCoordinatorOptions {
  sink: FirmwareCheckpointSink;
  generation: number;
  timeoutMs?: number;
  initialCheckpoint?: FirmwareCheckpoint;
}

const checkpointRejected = (detail: string, params: Record<string, unknown> = {}): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareCheckpointRejected, detail, {
    detail,
    ...params,
  });
};

const commitWithTimeout = async (
  sink: FirmwareCheckpointSink,
  checkpoint: FirmwareCheckpoint,
  timeoutMs: number
): Promise<void> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      sink.commit(checkpoint),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`checkpoint commit timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
};

export class FirmwareCheckpointCoordinator {
  private latestSequence: number;

  private terminal: boolean;

  private committing = false;

  private readonly timeoutMs: number;

  constructor(private readonly options: FirmwareCheckpointCoordinatorOptions) {
    if (!Number.isSafeInteger(options.generation) || options.generation < 0) {
      checkpointRejected('Firmware checkpoint generation must be a non-negative safe integer');
    }
    const timeoutMs = options.timeoutMs ?? DEFAULT_FIRMWARE_CHECKPOINT_TIMEOUT_MS;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
      checkpointRejected('Firmware checkpoint timeout must be a positive safe integer');
    }
    this.timeoutMs = timeoutMs;
    const initialCheckpoint = options.initialCheckpoint
      ? validateFirmwareCheckpoint(options.initialCheckpoint)
      : undefined;
    this.latestSequence = initialCheckpoint?.sequence ?? -1;
    this.terminal = initialCheckpoint?.terminal === true;
  }

  getGeneration(): number {
    return this.options.generation;
  }

  getLatestSequence(): number {
    return this.latestSequence;
  }

  isTerminal(): boolean {
    return this.terminal;
  }

  assertActive(generation: number): void {
    if (generation !== this.options.generation) {
      checkpointRejected(
        `Firmware callback generation ${generation} is stale; current generation is ${this.options.generation}`,
        {
          generation,
          currentGeneration: this.options.generation,
        }
      );
    }
    if (this.terminal) {
      checkpointRejected('Firmware transaction already has a terminal tombstone');
    }
  }

  async commit(value: FirmwareCheckpoint): Promise<FirmwareCheckpoint> {
    const checkpoint = validateFirmwareCheckpoint(value);
    this.assertActive(checkpoint.generation ?? this.options.generation);
    if (checkpoint.sequence <= this.latestSequence) {
      return checkpointRejected(
        `Firmware checkpoint sequence ${checkpoint.sequence} is not newer than ${this.latestSequence}`,
        {
          sequence: checkpoint.sequence,
          latestSequence: this.latestSequence,
        }
      );
    }
    if (this.committing) {
      return checkpointRejected('Firmware checkpoint commit is already in flight');
    }

    this.committing = true;
    try {
      await commitWithTimeout(this.options.sink, checkpoint, this.timeoutMs);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown checkpoint sink failure';
      return checkpointRejected(`Firmware checkpoint commit failed: ${detail}`, {
        sequence: checkpoint.sequence,
      });
    } finally {
      this.committing = false;
    }

    this.latestSequence = checkpoint.sequence;
    if (checkpoint.terminal === true) {
      this.terminal = true;
    }
    return checkpoint;
  }
}
