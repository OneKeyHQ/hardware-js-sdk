import { validateFirmwareCheckpoint } from './contracts';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';
import { validatePreparedPlan } from './preparedPlanValidator';

import type {
  FirmwareCheckpoint,
  FirmwareExpectedTargetState,
  FirmwareTarget,
  PreparedPlan,
} from './contracts';

export interface FirmwareObservedDeviceState {
  identity: string;
  model: string;
  mode: 'normal' | 'loader' | 'installing' | 'unknown';
  versions: Readonly<Partial<Record<FirmwareTarget, string>>>;
  hashes?: Readonly<Partial<Record<FirmwareTarget, string>>>;
  pendingInstall?: boolean;
  statusQuerySupported: boolean;
  statusAvailable: boolean;
  safeToAbandon?: boolean;
}

export type FirmwareReconciliationDecision =
  | 'continue'
  | 'retry-install'
  | 'attach-install'
  | 'epoch-completed'
  | 'transaction-completed';

export interface FirmwareReconciliationResult {
  decision: FirmwareReconciliationDecision;
  observed: FirmwareObservedDeviceState;
  completedArtifactIds: readonly string[];
  completedEpochIds: readonly string[];
  currentArtifactRestartOffset: 0;
}

export interface ReconcileFirmwareTransactionInput {
  preparedPlan: unknown;
  checkpoint: unknown;
  readDeviceState: () => Promise<FirmwareObservedDeviceState>;
}

const reconciliationUnavailable = (detail: string): never => {
  throw createFirmwareUpdateError(
    FirmwareUpdateErrorCode.FirmwareReconciliationUnavailable,
    detail,
    { detail }
  );
};

const matchesExpectedState = (
  observed: FirmwareObservedDeviceState,
  expected: FirmwareExpectedTargetState
): boolean => {
  if (expected.version !== undefined) {
    return observed.versions[expected.target] === expected.version;
  }
  return (
    expected.sha256 !== undefined &&
    observed.hashes?.[expected.target]?.toLowerCase() === expected.sha256.toLowerCase()
  );
};

const allTargetsMatch = (
  observed: FirmwareObservedDeviceState,
  expectedStates: readonly FirmwareExpectedTargetState[]
) =>
  expectedStates.length > 0 && expectedStates.every(state => matchesExpectedState(observed, state));

const expectedStatesForEpoch = (
  plan: PreparedPlan,
  checkpoint: FirmwareCheckpoint
): readonly FirmwareExpectedTargetState[] => {
  const epoch = plan.epochs.find(item => item.epochId === checkpoint.epochId);
  if (!epoch) {
    return [];
  }
  const targets = new Set(epoch.targetIds);
  return plan.expectedFinalStates.filter(state => targets.has(state.target));
};

const requiresInstallReconciliation = (checkpoint: FirmwareCheckpoint) =>
  checkpoint.state === 'AWAITING_CONFIRMATION' ||
  checkpoint.state === 'INSTALL_REQUESTED' ||
  checkpoint.state === 'INSTALLING' ||
  checkpoint.state === 'REBOOTING_BETWEEN_EPOCHS' ||
  checkpoint.installRequestStatus === 'request-pending' ||
  checkpoint.installRequestStatus === 'acknowledged';

const resolveInstallDecision = (
  plan: PreparedPlan,
  checkpoint: FirmwareCheckpoint,
  observed: FirmwareObservedDeviceState
): FirmwareReconciliationDecision => {
  const expectedStates = expectedStatesForEpoch(plan, checkpoint);
  if (allTargetsMatch(observed, expectedStates)) {
    return 'epoch-completed';
  }
  if (!observed.statusQuerySupported || !observed.statusAvailable) {
    return reconciliationUnavailable(
      'Firmware install status or version reconciliation is unavailable'
    );
  }
  if (observed.pendingInstall === true || observed.mode === 'installing') {
    return 'attach-install';
  }
  if (observed.pendingInstall === undefined) {
    return reconciliationUnavailable('Firmware pending-install status is unavailable');
  }
  if (
    checkpoint.state === 'AWAITING_CONFIRMATION' ||
    checkpoint.installRequestStatus === 'request-pending'
  ) {
    return 'retry-install';
  }
  if (
    checkpoint.state === 'INSTALL_REQUESTED' ||
    checkpoint.state === 'INSTALLING' ||
    checkpoint.installRequestStatus === 'acknowledged'
  ) {
    throw createFirmwareUpdateError(
      FirmwareUpdateErrorCode.FirmwareTransactionConflict,
      'Firmware install was acknowledged but the device has no matching or pending install'
    );
  }
  return 'continue';
};

export const reconcileFirmwareTransaction = async ({
  preparedPlan: preparedPlanValue,
  checkpoint: checkpointValue,
  readDeviceState,
}: ReconcileFirmwareTransactionInput): Promise<FirmwareReconciliationResult> => {
  const plan = validatePreparedPlan(preparedPlanValue);
  const checkpoint = validateFirmwareCheckpoint(checkpointValue);
  let observed: FirmwareObservedDeviceState;
  try {
    observed = await readDeviceState();
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown device state error';
    return reconciliationUnavailable(`Firmware device state query failed: ${detail}`);
  }

  if (
    typeof observed.identity !== 'string' ||
    observed.identity.length === 0 ||
    typeof observed.model !== 'string' ||
    observed.model.length === 0
  ) {
    return reconciliationUnavailable('Firmware device identity is unavailable');
  }
  if (observed.identity !== plan.device.identity || observed.model !== plan.device.model) {
    throw createFirmwareUpdateError(
      FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
      'Firmware recovery found a different device'
    );
  }
  if (checkpoint.planDigest !== plan.planDigest) {
    throw createFirmwareUpdateError(
      FirmwareUpdateErrorCode.FirmwarePlanDigestMismatch,
      'Firmware recovery checkpoint plan digest does not match'
    );
  }

  let decision: FirmwareReconciliationDecision = 'continue';
  if (allTargetsMatch(observed, plan.expectedFinalStates)) {
    decision = 'transaction-completed';
  } else if (requiresInstallReconciliation(checkpoint)) {
    decision = resolveInstallDecision(plan, checkpoint, observed);
  }

  return {
    decision,
    observed,
    completedArtifactIds: [...(checkpoint.completedArtifactIds ?? [])],
    completedEpochIds: [...(checkpoint.completedEpochIds ?? [])],
    currentArtifactRestartOffset: 0,
  };
};
