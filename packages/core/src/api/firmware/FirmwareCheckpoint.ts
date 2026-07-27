import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import type {
  FirmwareCheckpoint,
  FirmwareCheckpointParams,
  FirmwareCheckpointStage,
} from '../../types/api/firmwareUpdate';

const CHECKPOINT_TIMEOUT_MS = 5000;
const MAX_CHECKPOINT_TARGET_LENGTH = 160;

type FirmwareCheckpointState = {
  latestSequence: number;
  tail: Promise<void>;
};

const checkpointStateBySink = new WeakMap<
  NonNullable<FirmwareCheckpointParams['checkpointSink']>,
  FirmwareCheckpointState
>();

const checkpointError = (message: string) =>
  ERRORS.TypedError(HardwareErrorCode.RuntimeError, message, {
    firmwareUpdateCode: 'FirmwareCheckpointRejected',
  });

export const validateFirmwareCheckpoint = (value: unknown): FirmwareCheckpoint => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw checkpointError('Firmware resume checkpoint is invalid');
  }
  const checkpoint = value as Partial<FirmwareCheckpoint>;
  const allowedKeys = new Set([
    'schemaVersion',
    'sequence',
    'stage',
    'destructiveActionStarted',
    'target',
    'epoch',
  ]);
  if (
    Object.keys(checkpoint).some(key => !allowedKeys.has(key)) ||
    !['schemaVersion', 'sequence', 'stage', 'destructiveActionStarted'].every(key =>
      Object.prototype.hasOwnProperty.call(checkpoint, key)
    ) ||
    checkpoint.schemaVersion !== 1 ||
    !Number.isSafeInteger(checkpoint.sequence) ||
    (checkpoint.sequence as number) < 1 ||
    ![
      'EPOCH_STARTED',
      'EPOCH_COMPLETED',
      'BEFORE_DEVICE_MODE_CHANGE',
      'FILE_TRANSFER_STARTED',
      'FILE_TRANSFER_COMPLETED',
      'INSTALL_REQUESTED',
      'INSTALL_ACCEPTED',
      'FINAL_VERIFIED',
    ].includes(checkpoint.stage as string) ||
    checkpoint.destructiveActionStarted !== true ||
    (checkpoint.target !== undefined &&
      (!checkpoint.target ||
        checkpoint.target.length > MAX_CHECKPOINT_TARGET_LENGTH ||
        /(?:https?|file):\/\//iu.test(checkpoint.target) ||
        /^(?:\/|[A-Za-z]:[\\/])/u.test(checkpoint.target))) ||
    (checkpoint.epoch !== undefined &&
      (!Number.isSafeInteger(checkpoint.epoch) || checkpoint.epoch < 0))
  ) {
    throw checkpointError('Firmware resume checkpoint fields are invalid');
  }
  return checkpoint as FirmwareCheckpoint;
};

const validateCheckpointParams = (params: FirmwareCheckpointParams, required: boolean) => {
  const { checkpointSequenceStart, checkpointSink } = params;
  const resumeCheckpoint =
    params.resumeCheckpoint === undefined
      ? undefined
      : validateFirmwareCheckpoint(params.resumeCheckpoint);
  if (
    checkpointSequenceStart !== undefined &&
    (!Number.isSafeInteger(checkpointSequenceStart) || checkpointSequenceStart < 0)
  ) {
    throw checkpointError('Firmware checkpoint sequence is invalid');
  }
  if (
    checkpointSink !== undefined &&
    (typeof checkpointSink !== 'object' ||
      checkpointSink === null ||
      typeof checkpointSink.commit !== 'function')
  ) {
    throw checkpointError('Firmware checkpoint sink is invalid');
  }
  if (required && !checkpointSink) {
    throw checkpointError('Prepared firmware update requires a checkpoint sink');
  }
  if (resumeCheckpoint && checkpointSequenceStart !== resumeCheckpoint.sequence) {
    throw checkpointError('Firmware checkpoint sequence does not match recovery state');
  }
};

const waitForCheckpoint = async (commit: Promise<void>) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      commit,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(checkpointError('Firmware checkpoint commit timed out')),
          CHECKPOINT_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export class FirmwareCheckpointWriter {
  private readonly sink: FirmwareCheckpointParams['checkpointSink'];

  private readonly sequenceStart: number;

  constructor(params: FirmwareCheckpointParams, { required = false } = {}) {
    validateCheckpointParams(params, required);
    this.sink = params.checkpointSink;
    this.sequenceStart = params.checkpointSequenceStart ?? 0;
  }

  async commit({
    stage,
    target,
    epoch,
  }: {
    stage: FirmwareCheckpointStage;
    target?: string;
    epoch?: number;
  }): Promise<void> {
    if (!this.sink) return;
    if (
      (target !== undefined &&
        (!target ||
          target.length > MAX_CHECKPOINT_TARGET_LENGTH ||
          /(?:https?|file):\/\//iu.test(target) ||
          /^(?:\/|[A-Za-z]:[\\/])/u.test(target))) ||
      (epoch !== undefined && (!Number.isSafeInteger(epoch) || epoch < 0))
    ) {
      throw checkpointError('Firmware checkpoint metadata is invalid');
    }

    let state = checkpointStateBySink.get(this.sink);
    if (!state) {
      state = {
        latestSequence: this.sequenceStart,
        tail: Promise.resolve(),
      };
      checkpointStateBySink.set(this.sink, state);
    } else if (this.sequenceStart > state.latestSequence) {
      state.latestSequence = this.sequenceStart;
    }
    const activeState = state;

    const queuedCommit = activeState.tail.then(async () => {
      const sequence = activeState.latestSequence + 1;
      const checkpoint: FirmwareCheckpoint = {
        schemaVersion: 1,
        sequence,
        stage,
        destructiveActionStarted: true,
        ...(target ? { target } : {}),
        ...(epoch !== undefined ? { epoch } : {}),
      };
      try {
        await this.sink?.commit(checkpoint);
        activeState.latestSequence = sequence;
      } catch (error) {
        throw checkpointError(
          `Firmware checkpoint commit was rejected: ${
            error instanceof Error ? error.message : 'unknown error'
          }`
        );
      }
    });

    // Keep the real commit serialized even when the caller's timeout fires. A
    // later call cannot overtake an unresolved or late checkpoint write.
    activeState.tail = queuedCommit.catch(() => undefined);
    await waitForCheckpoint(queuedCommit);
  }
}
