import { openFirmwareArtifactByteSource } from './byteSource';
import { FirmwareCheckpointCoordinator } from './checkpoint';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';
import { firmwareHostBindingRegistry } from './hostBindingRegistry';
import { validatePreparedPlan } from './preparedPlanValidator';
import { reconcileFirmwareTransaction } from './reconcile';
import { FirmwareTransactionStateMachine } from './stateMachine';

import type { FirmwareByteSource } from './byteSource';
import type {
  FirmwareArtifactReceipt,
  FirmwareCheckpoint,
  FirmwareJsonValue,
  FirmwareProgressEvent,
  FirmwareTransactionState,
  FirmwareUpdateEpoch,
  PreparedPlan,
} from './contracts';
import type { FirmwareHostBindingRegistry } from './hostBindingRegistry';
import type { FirmwareObservedDeviceState, FirmwareReconciliationResult } from './reconcile';

export interface FirmwareArtifactTransferContext {
  transactionId: string;
  epoch: FirmwareUpdateEpoch;
  receipt: FirmwareArtifactReceipt;
  source: FirmwareByteSource;
  restartOffset: 0;
  isStopRequested: () => boolean;
  reportProgress: (completed: number, total: number) => Promise<void>;
}

export interface FirmwareEpochDriverContext {
  transactionId: string;
  epoch: FirmwareUpdateEpoch;
  isStopRequested: () => boolean;
}

export interface FirmwareExecutorDriver {
  readDeviceState(): Promise<FirmwareObservedDeviceState>;
  enterLoader?(context: FirmwareEpochDriverContext): Promise<void>;
  transferArtifact(context: FirmwareArtifactTransferContext): Promise<void>;
  stageEpoch?(context: FirmwareEpochDriverContext): Promise<void>;
  requestInstall?(context: FirmwareEpochDriverContext): Promise<void>;
  waitForInstall?(context: FirmwareEpochDriverContext): Promise<void>;
  rebootBetweenEpochs?(context: FirmwareEpochDriverContext): Promise<void>;
  verifyEpoch?(context: FirmwareEpochDriverContext): Promise<void>;
  verifyFinal(
    context: Omit<FirmwareEpochDriverContext, 'epoch'> & {
      expectedPlan: PreparedPlan;
    }
  ): Promise<void>;
  requiresLoaderTransition?(epoch: FirmwareUpdateEpoch): boolean;
  requiresInstall?(epoch: FirmwareUpdateEpoch): boolean;
}

export interface RecoverableFirmwareExecutorOptions {
  preparedPlan: unknown;
  transactionId: string;
  driver: FirmwareExecutorDriver;
  registry?: FirmwareHostBindingRegistry;
  initialCheckpoint?: unknown;
  checkpointTimeoutMs?: number;
  artifactSourceFactory?: (receipt: FirmwareArtifactReceipt) => Promise<FirmwareByteSource>;
  now?: () => number;
}

const isTerminalState = (state: FirmwareTransactionState) =>
  state === 'COMPLETED' || state === 'ABANDONED' || state === 'FAILED';

const isDestructiveState = (state: FirmwareTransactionState) =>
  state === 'ENTERING_LOADER' ||
  state === 'SYNCING_OR_TRANSFERRING' ||
  state === 'STAGED' ||
  state === 'AWAITING_CONFIRMATION' ||
  state === 'INSTALL_REQUESTED' ||
  state === 'INSTALLING' ||
  state === 'REBOOTING_BETWEEN_EPOCHS' ||
  state === 'FINAL_VERIFYING';

const defaultRequiresInstall = (epoch: FirmwareUpdateEpoch) =>
  epoch.kind === 'bootloader-install' || epoch.kind === 'component-install';

const executorConflict = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareTransactionConflict, detail, {
    detail,
  });
};

export class RecoverableFirmwareExecutor {
  private readonly plan: PreparedPlan;

  private readonly registry: FirmwareHostBindingRegistry;

  private readonly generation: number;

  private readonly machine: FirmwareTransactionStateMachine;

  private stopRequested = false;

  private running = false;

  constructor(private readonly options: RecoverableFirmwareExecutorOptions) {
    this.plan = validatePreparedPlan(options.preparedPlan);
    this.registry = options.registry ?? firmwareHostBindingRegistry;
    const snapshot = this.registry.capture();
    this.generation = snapshot.generation;
    const initialCheckpoint = options.initialCheckpoint
      ? (options.initialCheckpoint as FirmwareCheckpoint)
      : undefined;
    const checkpointCoordinator = new FirmwareCheckpointCoordinator({
      sink: snapshot.binding.checkpointSink,
      generation: this.generation,
      timeoutMs: options.checkpointTimeoutMs,
      initialCheckpoint,
    });
    this.machine = new FirmwareTransactionStateMachine({
      preparedPlan: this.plan,
      transactionId: options.transactionId,
      generation: this.generation,
      checkpointCoordinator,
      initialCheckpoint,
      initialState: 'PREPARED',
      now: options.now,
    });
  }

  private assertHostCurrent(): void {
    this.registry.assertCurrent(this.generation);
    this.machine.assertCallbackCurrent(this.generation);
  }

  private createEpochContext(epoch: FirmwareUpdateEpoch): FirmwareEpochDriverContext {
    return {
      transactionId: this.options.transactionId,
      epoch,
      isStopRequested: () => this.stopRequested,
    };
  }

  private async transition(
    state: FirmwareTransactionState,
    fields: Omit<
      Parameters<FirmwareTransactionStateMachine['transition']>[0],
      'state' | 'generation'
    > = {}
  ): Promise<FirmwareCheckpoint> {
    this.assertHostCurrent();
    const checkpoint = await this.machine.transition({
      state,
      generation: this.generation,
      ...fields,
    });
    this.registry.assertCurrent(this.generation);
    return checkpoint;
  }

  private async pauseForStop(): Promise<boolean> {
    if (!this.stopRequested || isTerminalState(this.machine.getState())) {
      return false;
    }
    if (this.machine.getState() !== 'PAUSED') {
      await this.transition('PAUSED');
    }
    return true;
  }

  private async reportArtifactProgress(
    epoch: FirmwareUpdateEpoch,
    receipt: FirmwareArtifactReceipt,
    completed: number,
    total: number
  ): Promise<void> {
    this.assertHostCurrent();
    const [target] = epoch.targetIds;
    const event: FirmwareProgressEvent = {
      transactionId: this.options.transactionId,
      phase: this.machine.getState(),
      completed,
      total,
      artifactId: receipt.artifactId,
      target,
    };
    const { binding } = this.registry.capture();
    await this.machine.reportProgress(this.generation, event, binding.progressSink);
    this.registry.assertCurrent(this.generation);
  }

  private async transferEpochArtifacts(epoch: FirmwareUpdateEpoch): Promise<void> {
    for (const artifactId of epoch.artifactIds) {
      if (!this.machine.getCompletedArtifactIds().includes(artifactId)) {
        if (await this.pauseForStop()) {
          return;
        }
        const receipt = this.plan.artifactReceipts.find(item => item.artifactId === artifactId);
        if (!receipt) {
          return executorConflict(
            `Firmware epoch ${epoch.epochId} has no receipt for ${artifactId}`
          );
        }
        await this.transition('SYNCING_OR_TRANSFERRING', {
          epochId: epoch.epochId,
          artifactId,
          artifactOffset: 0,
        });
        const source = await this.openArtifactSource(receipt);
        try {
          await this.options.driver.transferArtifact({
            transactionId: this.options.transactionId,
            epoch,
            receipt,
            source,
            restartOffset: 0,
            isStopRequested: () => this.stopRequested,
            reportProgress: (completed, total) =>
              this.reportArtifactProgress(epoch, receipt, completed, total),
          });
        } finally {
          await source.close();
        }
        await this.transition('SYNCING_OR_TRANSFERRING', {
          epochId: epoch.epochId,
          completedArtifactId: artifactId,
        });
      }
    }
  }

  private async openArtifactSource(receipt: FirmwareArtifactReceipt): Promise<FirmwareByteSource> {
    const source = this.options.artifactSourceFactory
      ? await this.options.artifactSourceFactory(receipt)
      : await openFirmwareArtifactByteSource(this.registry, receipt);
    if (source.size !== receipt.size) {
      await source.close();
      throw createFirmwareUpdateError(
        FirmwareUpdateErrorCode.FirmwareArtifactReceiptMismatch,
        `Firmware artifact ${receipt.artifactId} opened with size ${source.size}, expected ${receipt.size}`,
        {
          artifactId: receipt.artifactId,
          openedSize: source.size,
          receiptSize: receipt.size,
        }
      );
    }
    return source;
  }

  private async preflightArtifactSources(): Promise<void> {
    for (const receipt of this.plan.artifactReceipts) {
      const source = await this.openArtifactSource(receipt);
      await source.close();
    }
  }

  private async reconcile(): Promise<FirmwareReconciliationResult> {
    const checkpoint = this.machine.getCheckpoint();
    if (!checkpoint) {
      return executorConflict('Firmware reconciliation requires a persisted checkpoint');
    }
    const result = await reconcileFirmwareTransaction({
      preparedPlan: this.plan,
      checkpoint,
      readDeviceState: () => this.options.driver.readDeviceState(),
    });
    const { observed } = result;
    const versions: { [key: string]: FirmwareJsonValue } = {};
    Object.entries(observed.versions).forEach(([target, version]) => {
      if (typeof version === 'string') {
        versions[target] = version;
      }
    });
    const hashes: { [key: string]: FirmwareJsonValue } = {};
    Object.entries(observed.hashes ?? {}).forEach(([target, hash]) => {
      if (typeof hash === 'string') {
        hashes[target] = hash;
      }
    });
    const deviceState: FirmwareJsonValue = {
      identity: observed.identity,
      model: observed.model,
      mode: observed.mode,
      versions,
      hashes,
      statusQuerySupported: observed.statusQuerySupported,
      statusAvailable: observed.statusAvailable,
      ...(observed.pendingInstall === undefined ? {} : { pendingInstall: observed.pendingInstall }),
      ...(observed.safeToAbandon === undefined ? {} : { safeToAbandon: observed.safeToAbandon }),
    };
    await this.transition(this.machine.getState(), {
      ...(checkpoint.epochId ? { epochId: checkpoint.epochId } : {}),
      ...(checkpoint.artifactId
        ? {
            artifactId: checkpoint.artifactId,
            artifactOffset: 0,
          }
        : {}),
      ...(checkpoint.installRequestStatus
        ? { installRequestStatus: checkpoint.installRequestStatus }
        : {}),
      deviceState,
    });
    return result;
  }

  private async completeEpoch(epoch: FirmwareUpdateEpoch, isLastEpoch: boolean): Promise<void> {
    if (isLastEpoch) {
      await this.transition('FINAL_VERIFYING', {
        epochId: epoch.epochId,
        completedEpochId: epoch.epochId,
      });
      return;
    }
    await this.transition('REBOOTING_BETWEEN_EPOCHS', {
      epochId: epoch.epochId,
      completedEpochId: epoch.epochId,
    });
    await this.options.driver.rebootBetweenEpochs?.(this.createEpochContext(epoch));
    await this.transition('REVALIDATING_DEVICE', {
      epochId: epoch.epochId,
    });
  }

  private async executeInstallEpoch(
    epoch: FirmwareUpdateEpoch,
    isLastEpoch: boolean
  ): Promise<void> {
    await this.transition('AWAITING_CONFIRMATION', {
      epochId: epoch.epochId,
      installRequestStatus: 'request-pending',
    });
    const { decision } = await this.reconcile();
    if (decision === 'transaction-completed' || decision === 'epoch-completed') {
      await this.completeEpoch(epoch, isLastEpoch);
      return;
    }
    if (decision === 'continue') {
      executorConflict('Firmware install reconciliation returned no safe install action');
    }

    if (decision === 'retry-install') {
      const { driver } = this.options;
      if (!driver.requestInstall) {
        return executorConflict(`Firmware epoch ${epoch.epochId} has no install driver`);
      }
      await driver.requestInstall(this.createEpochContext(epoch));
    }
    await this.transition('INSTALL_REQUESTED', {
      epochId: epoch.epochId,
      installRequestStatus: 'acknowledged',
    });
    await this.transition('INSTALLING', {
      epochId: epoch.epochId,
      installRequestStatus: 'acknowledged',
    });
    await this.options.driver.waitForInstall?.(this.createEpochContext(epoch));
    if (await this.pauseForStop()) {
      return;
    }
    const { decision: completedDecision } = await this.reconcile();
    if (completedDecision !== 'epoch-completed' && completedDecision !== 'transaction-completed') {
      executorConflict(`Firmware epoch ${epoch.epochId} did not reconcile to an installed target`);
    }
    await this.completeEpoch(epoch, isLastEpoch);
  }

  private async executeEpoch(epoch: FirmwareUpdateEpoch, isLastEpoch: boolean): Promise<void> {
    if (epoch.kind === 'final-verify') {
      await this.transition('FINAL_VERIFYING', {
        epochId: epoch.epochId,
        completedEpochId: epoch.epochId,
      });
      return;
    }
    if (epoch.kind === 'bootloader-verify') {
      await this.options.driver.verifyEpoch?.(this.createEpochContext(epoch));
      await this.completeEpoch(epoch, isLastEpoch);
      return;
    }

    const requiresLoader =
      this.options.driver.requiresLoaderTransition?.(epoch) ??
      (epoch.kind === 'bootloader-install' || epoch.kind === 'component-install');
    if (requiresLoader && this.options.driver.enterLoader) {
      await this.transition('ENTERING_LOADER', {
        epochId: epoch.epochId,
        destructiveAction: true,
      });
      await this.options.driver.enterLoader(this.createEpochContext(epoch));
      if (await this.pauseForStop()) {
        return;
      }
    }
    await this.transition('SYNCING_OR_TRANSFERRING', {
      epochId: epoch.epochId,
      destructiveAction: true,
    });
    await this.transferEpochArtifacts(epoch);
    if (this.machine.getState() === 'PAUSED' || (await this.pauseForStop())) {
      return;
    }
    await this.options.driver.stageEpoch?.(this.createEpochContext(epoch));
    await this.transition('STAGED', {
      epochId: epoch.epochId,
    });

    const requiresInstall =
      this.options.driver.requiresInstall?.(epoch) ?? defaultRequiresInstall(epoch);
    if (requiresInstall) {
      await this.executeInstallEpoch(epoch, isLastEpoch);
      return;
    }
    await this.completeEpoch(epoch, isLastEpoch);
  }

  private getCheckpointEpoch(): FirmwareUpdateEpoch {
    const epochId = this.machine.getCheckpoint()?.epochId;
    const epoch = this.plan.epochs.find(item => item.epochId === epochId);
    if (!epoch) {
      return executorConflict('Firmware recovery checkpoint has no active epoch');
    }
    return epoch;
  }

  private isLastEpoch(epoch: FirmwareUpdateEpoch): boolean {
    return this.plan.epochs.at(-1)?.epochId === epoch.epochId;
  }

  private async resumeInstallAction(): Promise<void> {
    const epoch = this.getCheckpointEpoch();
    const { decision } = await this.reconcile();
    if (decision === 'transaction-completed' || decision === 'epoch-completed') {
      if (this.machine.getState() === 'PAUSED') {
        await this.transition('REVALIDATING_DEVICE', { epochId: epoch.epochId });
      }
      await this.completeEpoch(epoch, this.isLastEpoch(epoch));
      return;
    }
    if (decision === 'continue') {
      executorConflict('Firmware install recovery returned no safe action');
    }

    if (this.machine.getState() === 'PAUSED') {
      await this.transition('REVALIDATING_DEVICE', { epochId: epoch.epochId });
    }
    if (decision === 'retry-install') {
      if (this.machine.getState() !== 'AWAITING_CONFIRMATION') {
        await this.transition('AWAITING_CONFIRMATION', {
          epochId: epoch.epochId,
          installRequestStatus: 'request-pending',
        });
      }
      const { driver } = this.options;
      if (!driver.requestInstall) {
        return executorConflict(`Firmware epoch ${epoch.epochId} has no install driver`);
      }
      await driver.requestInstall(this.createEpochContext(epoch));
    }
    if (this.machine.getState() !== 'INSTALL_REQUESTED') {
      await this.transition('INSTALL_REQUESTED', {
        epochId: epoch.epochId,
        installRequestStatus: 'acknowledged',
      });
    }
    await this.transition('INSTALLING', {
      epochId: epoch.epochId,
      installRequestStatus: 'acknowledged',
    });
    await this.options.driver.waitForInstall?.(this.createEpochContext(epoch));
    if (await this.pauseForStop()) {
      return;
    }
    const { decision: completedDecision } = await this.reconcile();
    if (completedDecision !== 'epoch-completed' && completedDecision !== 'transaction-completed') {
      executorConflict(`Firmware epoch ${epoch.epochId} did not reconcile to an installed target`);
    }
    await this.completeEpoch(epoch, this.isLastEpoch(epoch));
  }

  private isInterruptedInstallCheckpoint(): boolean {
    const checkpoint = this.machine.getCheckpoint();
    return (
      checkpoint?.state === 'AWAITING_CONFIRMATION' ||
      checkpoint?.state === 'INSTALL_REQUESTED' ||
      checkpoint?.state === 'INSTALLING' ||
      checkpoint?.installRequestStatus === 'request-pending' ||
      checkpoint?.installRequestStatus === 'acknowledged'
    );
  }

  private async normalizeInterruptedExecution(): Promise<void> {
    const state = this.machine.getState();
    if (isTerminalState(state) || state === 'FINAL_VERIFYING') {
      return;
    }
    if (this.isInterruptedInstallCheckpoint()) {
      await this.resumeInstallAction();
      return;
    }
    if (state === 'ENTERING_LOADER' || state === 'SYNCING_OR_TRANSFERRING' || state === 'STAGED') {
      await this.transition('PAUSED');
    }
    if (
      this.machine.getState() === 'PAUSED' ||
      this.machine.getState() === 'REBOOTING_BETWEEN_EPOCHS'
    ) {
      await this.transition('REVALIDATING_DEVICE', {
        epochId: this.machine.getCheckpoint()?.epochId,
      });
    }
  }

  private async enterFinalVerificationAfterReconciliation(): Promise<void> {
    for (const epoch of this.plan.epochs) {
      if (!this.machine.getCompletedEpochIds().includes(epoch.epochId)) {
        for (const artifactId of epoch.artifactIds) {
          if (!this.machine.getCompletedArtifactIds().includes(artifactId)) {
            await this.transition(this.machine.getState(), {
              epochId: epoch.epochId,
              completedArtifactId: artifactId,
            });
          }
        }
        await this.transition(this.machine.getState(), {
          epochId: epoch.epochId,
          completedEpochId: epoch.epochId,
        });
      }
    }
    await this.transition('FINAL_VERIFYING');
  }

  private async runInternal(): Promise<FirmwareCheckpoint> {
    if (!this.machine.getCheckpoint()) {
      await this.transition('PREPARED');
    }
    await this.preflightArtifactSources();
    if (await this.pauseForStop()) {
      return this.machine.getCheckpoint() as FirmwareCheckpoint;
    }
    await this.normalizeInterruptedExecution();
    if (this.machine.getState() === 'COMPLETED') {
      return this.machine.getCheckpoint() as FirmwareCheckpoint;
    }
    if (
      this.machine.getState() !== 'REVALIDATING_DEVICE' &&
      this.machine.getState() !== 'FINAL_VERIFYING'
    ) {
      await this.transition('REVALIDATING_DEVICE', {
        epochId: this.machine.getCheckpoint()?.epochId,
      });
    }
    const initialReconciliation =
      this.machine.getState() === 'FINAL_VERIFYING' ? null : await this.reconcile();
    if (initialReconciliation?.decision === 'transaction-completed') {
      await this.enterFinalVerificationAfterReconciliation();
    }

    if (this.machine.getState() !== 'FINAL_VERIFYING') {
      const incompleteEpochs = this.plan.epochs.filter(
        epoch => !this.machine.getCompletedEpochIds().includes(epoch.epochId)
      );
      for (const [index, epoch] of incompleteEpochs.entries()) {
        if (await this.pauseForStop()) {
          break;
        }
        await this.executeEpoch(epoch, index === incompleteEpochs.length - 1);
        if (this.machine.getState() === 'PAUSED') {
          break;
        }
      }
    }

    if (this.machine.getState() === 'FINAL_VERIFYING') {
      await this.options.driver.verifyFinal({
        transactionId: this.options.transactionId,
        expectedPlan: this.plan,
        isStopRequested: () => this.stopRequested,
      });
      await this.transition('COMPLETED');
    }
    const checkpoint = this.machine.getCheckpoint();
    if (!checkpoint) {
      return executorConflict('Firmware executor finished without a checkpoint');
    }
    return checkpoint;
  }

  async run(): Promise<FirmwareCheckpoint> {
    if (this.running) {
      return executorConflict('Firmware executor is already running');
    }
    this.running = true;
    try {
      return await this.runInternal();
    } catch (error) {
      const state = this.machine.getState();
      if (!isTerminalState(state) && state !== 'PAUSED') {
        try {
          await this.transition(isDestructiveState(state) ? 'PAUSED' : 'FAILED');
        } catch {
          // Preserve the original execution error if failure persistence is also unavailable.
        }
      }
      throw error;
    } finally {
      this.running = false;
    }
  }

  async cancel(): Promise<FirmwareCheckpoint | null> {
    this.stopRequested = true;
    if (this.running) {
      return this.machine.getCheckpoint();
    }
    const state = this.machine.getState();
    if (isTerminalState(state)) {
      return this.machine.getCheckpoint();
    }
    if (!isDestructiveState(state)) {
      return this.transition('ABANDONED', { safeToAbandon: true });
    }
    return this.transition('PAUSED');
  }

  getCheckpoint(): FirmwareCheckpoint | null {
    return this.machine.getCheckpoint();
  }
}
