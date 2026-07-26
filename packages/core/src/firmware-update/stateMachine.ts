import { FIRMWARE_CHECKPOINT_SCHEMA_VERSION } from './capabilities';
import { validateFirmwareCheckpoint } from './contracts';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';
import { validatePreparedPlan } from './preparedPlanValidator';

import type { FirmwareCheckpointCoordinator } from './checkpoint';
import type {
  FirmwareCheckpoint,
  FirmwareJsonValue,
  FirmwareProgressEvent,
  FirmwareProgressSink,
  FirmwareTransactionState,
  PreparedPlan,
} from './contracts';

const TERMINAL_STATES = new Set<FirmwareTransactionState>(['COMPLETED', 'ABANDONED', 'FAILED']);

const DESTRUCTIVE_STATES = new Set<FirmwareTransactionState>([
  'ENTERING_LOADER',
  'SYNCING_OR_TRANSFERRING',
  'STAGED',
  'AWAITING_CONFIRMATION',
  'INSTALL_REQUESTED',
  'INSTALLING',
  'REBOOTING_BETWEEN_EPOCHS',
  'FINAL_VERIFYING',
  'COMPLETED',
]);

const ALLOWED_TRANSITIONS: Readonly<
  Record<FirmwareTransactionState, ReadonlySet<FirmwareTransactionState>>
> = {
  DEVICE_SNAPSHOT: new Set(['PLAN_CREATED', 'ABANDONED', 'FAILED']),
  PLAN_CREATED: new Set(['ACQUIRING_ARTIFACTS', 'ABANDONED', 'FAILED']),
  ACQUIRING_ARTIFACTS: new Set([
    'MATERIALIZING_ARTIFACTS',
    'VERIFYING_LOCAL_ARTIFACTS',
    'PAUSED',
    'ABANDONED',
    'FAILED',
  ]),
  MATERIALIZING_ARTIFACTS: new Set(['VERIFYING_LOCAL_ARTIFACTS', 'PAUSED', 'ABANDONED', 'FAILED']),
  VERIFYING_LOCAL_ARTIFACTS: new Set(['PREPARED', 'PAUSED', 'ABANDONED', 'FAILED']),
  PREPARED: new Set(['REVALIDATING_DEVICE', 'PAUSED', 'ABANDONED', 'FAILED']),
  REVALIDATING_DEVICE: new Set([
    'ENTERING_LOADER',
    'SYNCING_OR_TRANSFERRING',
    'AWAITING_CONFIRMATION',
    'INSTALL_REQUESTED',
    'REBOOTING_BETWEEN_EPOCHS',
    'FINAL_VERIFYING',
    'PAUSED',
    'ABANDONED',
    'FAILED',
  ]),
  ENTERING_LOADER: new Set(['SYNCING_OR_TRANSFERRING', 'PAUSED', 'FAILED']),
  SYNCING_OR_TRANSFERRING: new Set(['STAGED', 'PAUSED', 'FAILED']),
  STAGED: new Set([
    'AWAITING_CONFIRMATION',
    'INSTALL_REQUESTED',
    'REBOOTING_BETWEEN_EPOCHS',
    'FINAL_VERIFYING',
    'PAUSED',
    'FAILED',
  ]),
  AWAITING_CONFIRMATION: new Set([
    'INSTALL_REQUESTED',
    'REBOOTING_BETWEEN_EPOCHS',
    'FINAL_VERIFYING',
    'PAUSED',
    'FAILED',
  ]),
  INSTALL_REQUESTED: new Set([
    'INSTALLING',
    'REBOOTING_BETWEEN_EPOCHS',
    'FINAL_VERIFYING',
    'PAUSED',
    'FAILED',
  ]),
  INSTALLING: new Set(['REBOOTING_BETWEEN_EPOCHS', 'FINAL_VERIFYING', 'PAUSED', 'FAILED']),
  REBOOTING_BETWEEN_EPOCHS: new Set(['REVALIDATING_DEVICE', 'FINAL_VERIFYING', 'PAUSED', 'FAILED']),
  FINAL_VERIFYING: new Set(['COMPLETED', 'PAUSED', 'FAILED']),
  COMPLETED: new Set(),
  PAUSED: new Set(['REVALIDATING_DEVICE', 'ABANDONED', 'FAILED']),
  ABANDONED: new Set(),
  FAILED: new Set(),
};

export interface FirmwareStateMachineOptions {
  preparedPlan: unknown;
  transactionId: string;
  generation: number;
  checkpointCoordinator: FirmwareCheckpointCoordinator;
  initialCheckpoint?: unknown;
  initialState?: FirmwareTransactionState;
  now?: () => number;
}

export interface FirmwareStateTransition {
  state: FirmwareTransactionState;
  generation: number;
  epochId?: string;
  artifactId?: string;
  artifactOffset?: number;
  completedArtifactId?: string;
  completedEpochId?: string;
  target?: FirmwareCheckpoint['target'];
  destructiveAction?: boolean;
  safeToAbandon?: boolean;
  installRequestStatus?: FirmwareCheckpoint['installRequestStatus'];
  deviceState?: FirmwareJsonValue;
}

const transactionConflict = (detail: string, params: Record<string, unknown> = {}): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareTransactionConflict, detail, {
    detail,
    ...params,
  });
};

const assertResumeCompatibility = (
  plan: PreparedPlan,
  checkpoint: FirmwareCheckpoint,
  transactionId: string
) => {
  if (checkpoint.transactionId !== transactionId) {
    transactionConflict('Firmware checkpoint belongs to a different transaction');
  }
  if (checkpoint.planDigest !== plan.planDigest) {
    throw createFirmwareUpdateError(
      FirmwareUpdateErrorCode.FirmwarePlanDigestMismatch,
      'Firmware checkpoint plan digest does not match the prepared plan'
    );
  }
  if (
    checkpoint.deviceIdentity !== undefined &&
    checkpoint.deviceIdentity !== plan.device.identity
  ) {
    throw createFirmwareUpdateError(
      FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
      'Firmware checkpoint belongs to a different device'
    );
  }
};

export class FirmwareTransactionStateMachine {
  private readonly plan: PreparedPlan;

  private readonly now: () => number;

  private checkpoint: FirmwareCheckpoint | null;

  private readonly completedArtifactIds: Set<string>;

  private readonly completedEpochIds: Set<string>;

  private destructiveActionStarted: boolean;

  constructor(private readonly options: FirmwareStateMachineOptions) {
    this.plan = validatePreparedPlan(options.preparedPlan);
    if (typeof options.transactionId !== 'string' || options.transactionId.length === 0) {
      transactionConflict('Firmware transactionId must be a non-empty string');
    }
    if (!Number.isSafeInteger(options.generation) || options.generation < 0) {
      transactionConflict('Firmware transaction generation must be a non-negative safe integer');
    }
    if (options.checkpointCoordinator.getGeneration() !== options.generation) {
      transactionConflict('Firmware checkpoint coordinator generation does not match');
    }
    this.now = options.now ?? Date.now;
    this.checkpoint = options.initialCheckpoint
      ? validateFirmwareCheckpoint(options.initialCheckpoint)
      : null;
    if (this.checkpoint) {
      assertResumeCompatibility(this.plan, this.checkpoint, options.transactionId);
    }
    this.completedArtifactIds = new Set(this.checkpoint?.completedArtifactIds ?? []);
    this.completedEpochIds = new Set(this.checkpoint?.completedEpochIds ?? []);
    this.destructiveActionStarted = this.checkpoint?.destructiveActionStarted ?? false;
    this.assertPersistedProgress();
  }

  private assertPersistedProgress(): void {
    const artifactIds = new Set(this.plan.artifactReceipts.map(receipt => receipt.artifactId));
    this.completedArtifactIds.forEach(artifactId => {
      if (!artifactIds.has(artifactId)) {
        transactionConflict(`Firmware checkpoint completed unknown artifact ${artifactId}`);
      }
    });
    const epochIds = new Set(this.plan.epochs.map(epoch => epoch.epochId));
    this.completedEpochIds.forEach(epochId => {
      const epoch = this.plan.epochs.find(item => item.epochId === epochId);
      if (!epoch) {
        return transactionConflict(`Firmware checkpoint completed unknown epoch ${epochId}`);
      }
      const incompleteArtifact = epoch.artifactIds.find(
        artifactId => !this.completedArtifactIds.has(artifactId)
      );
      if (incompleteArtifact) {
        transactionConflict(
          `Firmware checkpoint completed epoch ${epochId} before artifact ${incompleteArtifact}`
        );
      }
      const incompleteDependency = epoch.dependsOn.find(
        dependencyId => !this.completedEpochIds.has(dependencyId)
      );
      if (incompleteDependency) {
        transactionConflict(
          `Firmware checkpoint completed epoch ${epochId} before dependency ${incompleteDependency}`
        );
      }
    });
    if (this.checkpoint?.epochId && !epochIds.has(this.checkpoint.epochId)) {
      transactionConflict(
        `Firmware checkpoint references unknown epoch ${this.checkpoint.epochId}`
      );
    }
    if (this.checkpoint?.artifactId && !artifactIds.has(this.checkpoint.artifactId)) {
      transactionConflict(
        `Firmware checkpoint references unknown artifact ${this.checkpoint.artifactId}`
      );
    }
  }

  private getCurrentState(): FirmwareTransactionState {
    return this.checkpoint?.state ?? this.options.initialState ?? 'PREPARED';
  }

  private assertTransitionAllowed(nextState: FirmwareTransactionState): void {
    const currentState = this.getCurrentState();
    if (nextState === currentState) {
      if (TERMINAL_STATES.has(currentState)) {
        transactionConflict(`Firmware transaction is already terminal in ${currentState}`);
      }
      return;
    }
    if (!ALLOWED_TRANSITIONS[currentState].has(nextState)) {
      transactionConflict(
        `Firmware transaction cannot transition from ${currentState} to ${nextState}`,
        {
          currentState,
          nextState,
        }
      );
    }
  }

  private assertEpochProgress(epochId: string | undefined): void {
    if (!epochId) {
      return;
    }
    const nextIndex = this.plan.epochs.findIndex(epoch => epoch.epochId === epochId);
    if (nextIndex < 0) {
      transactionConflict(`Firmware transaction references unknown epoch ${epochId}`);
    }
    const currentEpochId = this.checkpoint?.epochId;
    if (currentEpochId) {
      const currentIndex = this.plan.epochs.findIndex(epoch => epoch.epochId === currentEpochId);
      if (nextIndex < currentIndex || nextIndex > currentIndex + 1) {
        transactionConflict(
          `Firmware transaction cannot move from epoch ${currentEpochId} to ${epochId}`
        );
      }
    } else {
      const firstIncompleteIndex = this.plan.epochs.findIndex(
        epoch => !this.completedEpochIds.has(epoch.epochId)
      );
      if (firstIncompleteIndex >= 0 && nextIndex !== firstIncompleteIndex) {
        transactionConflict(`Firmware transaction cannot skip directly to epoch ${epochId}`);
      }
    }
    this.plan.epochs[nextIndex]?.dependsOn.forEach(dependencyId => {
      if (!this.completedEpochIds.has(dependencyId)) {
        transactionConflict(`Firmware epoch ${epochId} requires incomplete epoch ${dependencyId}`);
      }
    });
  }

  private applyCompletedArtifact(
    artifactId: string | undefined,
    epochId: string | undefined
  ): void {
    if (!artifactId) {
      return;
    }
    const epoch = this.plan.epochs.find(item => item.epochId === epochId);
    if (!epoch?.artifactIds.includes(artifactId)) {
      transactionConflict(
        `Firmware artifact ${artifactId} does not belong to epoch ${epochId ?? '<none>'}`
      );
    }
    this.completedArtifactIds.add(artifactId);
  }

  private applyCompletedEpoch(epochId: string | undefined): void {
    if (!epochId) {
      return;
    }
    const epoch = this.plan.epochs.find(item => item.epochId === epochId);
    if (!epoch) {
      return transactionConflict(`Firmware transaction completed unknown epoch ${epochId}`);
    }
    const incompleteArtifact = epoch.artifactIds.find(
      artifactId => !this.completedArtifactIds.has(artifactId)
    );
    if (incompleteArtifact) {
      transactionConflict(
        `Firmware epoch ${epochId} cannot complete before artifact ${incompleteArtifact}`
      );
    }
    this.completedEpochIds.add(epochId);
  }

  private createCheckpoint(transition: FirmwareStateTransition): FirmwareCheckpoint {
    const terminal = TERMINAL_STATES.has(transition.state);
    const destructiveActionStarted =
      this.destructiveActionStarted ||
      transition.destructiveAction === true ||
      DESTRUCTIVE_STATES.has(transition.state);
    const preservesInterruptedAction =
      transition.state === 'PAUSED' || transition.state === 'REVALIDATING_DEVICE';
    const epochId = transition.epochId ?? this.checkpoint?.epochId;
    const artifactId =
      transition.artifactId ??
      (preservesInterruptedAction ? this.checkpoint?.artifactId : undefined);
    const artifactOffset =
      transition.artifactOffset ?? (artifactId && preservesInterruptedAction ? 0 : undefined);
    const installRequestStatus =
      transition.installRequestStatus ??
      (preservesInterruptedAction ? this.checkpoint?.installRequestStatus : undefined);
    return {
      schemaVersion: FIRMWARE_CHECKPOINT_SCHEMA_VERSION,
      transactionId: this.options.transactionId,
      planDigest: this.plan.planDigest,
      sequence: (this.checkpoint?.sequence ?? -1) + 1,
      state: transition.state,
      timestampMs: this.now(),
      generation: this.options.generation,
      deviceIdentity: this.plan.device.identity,
      ...(epochId ? { epochId } : {}),
      ...(artifactId ? { artifactId } : {}),
      ...(artifactOffset !== undefined ? { artifactOffset } : {}),
      ...(transition.target ? { target: transition.target } : {}),
      completedArtifactIds: [...this.completedArtifactIds],
      completedEpochIds: [...this.completedEpochIds],
      destructiveActionStarted,
      terminal,
      ...(installRequestStatus ? { installRequestStatus } : {}),
      ...(transition.deviceState !== undefined ? { deviceState: transition.deviceState } : {}),
    };
  }

  getState(): FirmwareTransactionState {
    return this.getCurrentState();
  }

  getCheckpoint(): FirmwareCheckpoint | null {
    return this.checkpoint;
  }

  getCompletedArtifactIds(): readonly string[] {
    return [...this.completedArtifactIds];
  }

  getCompletedEpochIds(): readonly string[] {
    return [...this.completedEpochIds];
  }

  getCurrentArtifactRestartOffset(): number {
    return 0;
  }

  assertCallbackCurrent(generation: number): void {
    this.options.checkpointCoordinator.assertActive(generation);
  }

  async transition(transition: FirmwareStateTransition): Promise<FirmwareCheckpoint> {
    this.options.checkpointCoordinator.assertActive(transition.generation);
    this.assertTransitionAllowed(transition.state);
    this.assertEpochProgress(transition.epochId);
    if (transition.artifactOffset !== undefined && transition.artifactOffset !== 0) {
      transactionConflict('Firmware artifact recovery must restart the current file at offset 0');
    }
    if (
      transition.state === 'ABANDONED' &&
      this.destructiveActionStarted &&
      transition.safeToAbandon !== true
    ) {
      transactionConflict(
        'Firmware transaction cannot be abandoned after a destructive checkpoint without reconciliation'
      );
    }

    const previousArtifacts = new Set(this.completedArtifactIds);
    const previousEpochs = new Set(this.completedEpochIds);
    this.applyCompletedArtifact(transition.completedArtifactId, transition.epochId);
    this.applyCompletedEpoch(transition.completedEpochId);
    if (
      transition.state === 'COMPLETED' &&
      this.completedEpochIds.size !== this.plan.epochs.length
    ) {
      this.completedArtifactIds.clear();
      previousArtifacts.forEach(artifactId => this.completedArtifactIds.add(artifactId));
      this.completedEpochIds.clear();
      previousEpochs.forEach(epochId => this.completedEpochIds.add(epochId));
      return transactionConflict('Firmware transaction cannot complete before every epoch');
    }
    const candidate = this.createCheckpoint(transition);
    try {
      const committed = await this.options.checkpointCoordinator.commit(candidate);
      this.checkpoint = committed;
      this.destructiveActionStarted = committed.destructiveActionStarted ?? false;
      return committed;
    } catch (error) {
      this.completedArtifactIds.clear();
      previousArtifacts.forEach(artifactId => this.completedArtifactIds.add(artifactId));
      this.completedEpochIds.clear();
      previousEpochs.forEach(epochId => this.completedEpochIds.add(epochId));
      throw error;
    }
  }

  async reportProgress(
    generation: number,
    event: FirmwareProgressEvent,
    sink?: FirmwareProgressSink
  ): Promise<void> {
    this.assertCallbackCurrent(generation);
    if (event.transactionId !== this.options.transactionId) {
      transactionConflict('Firmware progress event belongs to a different transaction');
    }
    if (event.phase !== this.getCurrentState()) {
      transactionConflict('Firmware progress event does not match the current transaction state');
    }
    if (
      !Number.isSafeInteger(event.completed) ||
      !Number.isSafeInteger(event.total) ||
      event.completed < 0 ||
      event.total < 0 ||
      event.completed > event.total
    ) {
      transactionConflict('Firmware progress event has invalid totals');
    }
    await sink?.report(event);
    this.assertCallbackCurrent(generation);
  }
}
