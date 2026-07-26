import { FIRMWARE_PREPARED_PLAN_SCHEMA_VERSION } from './capabilities';
import {
  compileFirmwareArchiveReceiptExpansions,
  validateFirmwareArchiveReceiptRelationships,
} from './archivePlan';
import { deepFreezeFirmwareValue } from './canonical';
import { validatePreparedPlanContract } from './contracts';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';
import { validateFirmwareUpdatePlan } from './planDigest';

import type { FirmwareArchiveReceiptExpansion } from './archivePlan';
import type {
  FirmwareArtifactMaterialization,
  FirmwareArtifactReceipt,
  FirmwareUpdatePlan,
  PreparedPlan,
} from './contracts';

export interface PrepareFirmwareUpdateInput {
  plan: unknown;
  artifactReceipts: unknown;
}

const receiptError = (detail: string, params: Record<string, unknown> = {}): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareArtifactReceiptMismatch, detail, {
    detail,
    ...params,
  });
};

const expectedMaterialization = (
  plan: FirmwareUpdatePlan,
  artifactId: string
): FirmwareArtifactMaterialization => {
  const artifact = plan.artifacts.find(item => item.artifactId === artifactId);
  if (!artifact) {
    return receiptError(`Firmware receipt references unknown artifact ${artifactId}`);
  }
  if (artifact.container.kind === 'archive') {
    return {
      kind: 'archive',
      materializationPolicy: artifact.container.materializationPolicy,
    };
  }
  return { kind: 'raw' };
};

const assertMaterialization = (
  artifactId: string,
  actual: FirmwareArtifactMaterialization,
  expected: FirmwareArtifactMaterialization
) => {
  if (
    actual.kind !== expected.kind ||
    (actual.kind === 'archive' &&
      expected.kind === 'archive' &&
      actual.materializationPolicy !== expected.materializationPolicy) ||
    (actual.kind === 'archive-entry' &&
      expected.kind === 'archive-entry' &&
      (actual.parentArtifactId !== expected.parentArtifactId ||
        actual.entryId !== expected.entryId))
  ) {
    receiptError(`Firmware artifact ${artifactId} materialization does not match its plan`, {
      artifactId,
    });
  }
};

interface FirmwareReceiptPlanBinding {
  expansions: readonly FirmwareArchiveReceiptExpansion[];
  orderedReceipts: readonly FirmwareArtifactReceipt[];
}

const assertReceiptMatchesPlan = (
  plan: FirmwareUpdatePlan,
  receipts: readonly FirmwareArtifactReceipt[]
): FirmwareReceiptPlanBinding => {
  const receiptsById = new Map(receipts.map(receipt => [receipt.artifactId, receipt]));
  plan.artifacts.forEach(artifact => {
    const receipt = receiptsById.get(artifact.artifactId);
    if (!receipt) {
      return receiptError(`Firmware artifact ${artifact.artifactId} is not prepared`, {
        artifactId: artifact.artifactId,
      });
    }
    if (artifact.expectedSize !== undefined && receipt.size !== artifact.expectedSize) {
      receiptError(`Firmware artifact ${artifact.artifactId} size does not match its plan`, {
        artifactId: artifact.artifactId,
        expectedSize: artifact.expectedSize,
        receiptSize: receipt.size,
      });
    }
    if (
      artifact.expectedSha256 !== undefined &&
      receipt.sha256.toLowerCase() !== artifact.expectedSha256.toLowerCase()
    ) {
      receiptError(`Firmware artifact ${artifact.artifactId} digest does not match its plan`, {
        artifactId: artifact.artifactId,
        expectedSha256: artifact.expectedSha256,
        receiptSha256: receipt.sha256,
      });
    }
    if (receipt.integrity !== artifact.integrity) {
      receiptError(`Firmware artifact ${artifact.artifactId} integrity label changed`, {
        artifactId: artifact.artifactId,
        planIntegrity: artifact.integrity,
        receiptIntegrity: receipt.integrity,
      });
    }
    if (receipt.role !== artifact.role || receipt.target !== artifact.target) {
      receiptError(`Firmware artifact ${artifact.artifactId} execution metadata changed`, {
        artifactId: artifact.artifactId,
        planRole: artifact.role,
        receiptRole: receipt.role,
        planTarget: artifact.target,
        receiptTarget: receipt.target,
      });
    }
    const expectedLogicalName =
      artifact.devicePathRule.kind === 'sdk-generated'
        ? artifact.devicePathRule.logicalName
        : undefined;
    if (receipt.logicalName !== expectedLogicalName) {
      receiptError(`Firmware artifact ${artifact.artifactId} logical name changed`, {
        artifactId: artifact.artifactId,
        planLogicalName: expectedLogicalName,
        receiptLogicalName: receipt.logicalName,
      });
    }
    assertMaterialization(
      artifact.artifactId,
      receipt.materialization,
      expectedMaterialization(plan, artifact.artifactId)
    );
  });

  const expansions = compileFirmwareArchiveReceiptExpansions(plan, receipts);
  const childReceiptsByParentId = new Map(
    expansions.map(expansion => [expansion.parentArtifactId, expansion.childReceipts])
  );
  const accountedReceiptIds = new Set<string>();
  const orderedReceipts = plan.artifacts.flatMap(artifact => {
    const receipt = receiptsById.get(artifact.artifactId);
    if (!receipt) {
      return receiptError(`Firmware artifact ${artifact.artifactId} is not prepared`, {
        artifactId: artifact.artifactId,
      });
    }
    accountedReceiptIds.add(receipt.artifactId);
    const children = childReceiptsByParentId.get(artifact.artifactId) ?? [];
    children.forEach(child => accountedReceiptIds.add(child.artifactId));
    return [receipt, ...children];
  });
  const unexpectedReceipt = receipts.find(receipt => !accountedReceiptIds.has(receipt.artifactId));
  if (unexpectedReceipt) {
    receiptError(`Firmware receipt references unknown artifact ${unexpectedReceipt.artifactId}`, {
      artifactId: unexpectedReceipt.artifactId,
    });
  }
  return {
    expansions,
    orderedReceipts,
  };
};

const expandArchiveEpochs = (
  plan: FirmwareUpdatePlan,
  expansions: readonly FirmwareArchiveReceiptExpansion[]
) => {
  const childrenByParentId = new Map(
    expansions.map(expansion => [
      expansion.parentArtifactId,
      expansion.childReceipts.map(receipt => receipt.artifactId),
    ])
  );
  return plan.epochs.map(epoch => ({
    ...epoch,
    artifactIds: epoch.artifactIds.flatMap(
      artifactId => childrenByParentId.get(artifactId) ?? [artifactId]
    ),
    dependsOn: [...epoch.dependsOn],
    targetIds: [...epoch.targetIds],
  }));
};

const assertPreparedRelationships = (preparedPlan: PreparedPlan) => {
  validateFirmwareArchiveReceiptRelationships(preparedPlan.artifactReceipts);
  const receiptIds = new Set(preparedPlan.artifactReceipts.map(receipt => receipt.artifactId));
  const epochsById = new Map(preparedPlan.epochs.map(epoch => [epoch.epochId, epoch]));
  const coveredReceiptIds = new Set<string>();
  preparedPlan.epochs.forEach(epoch => {
    epoch.artifactIds.forEach(artifactId => {
      if (!receiptIds.has(artifactId)) {
        receiptError(`Prepared epoch ${epoch.epochId} references missing artifact ${artifactId}`);
      }
      if (coveredReceiptIds.has(artifactId)) {
        receiptError(`Prepared artifact ${artifactId} is assigned to more than one epoch`);
      }
      coveredReceiptIds.add(artifactId);
    });
    epoch.dependsOn.forEach(dependencyId => {
      if (!epochsById.has(dependencyId)) {
        receiptError(`Prepared epoch ${epoch.epochId} references missing epoch ${dependencyId}`);
      }
    });
  });
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visitEpoch = (epochId: string) => {
    if (visiting.has(epochId)) {
      receiptError(`Prepared epoch dependency cycle includes ${epochId}`);
    }
    if (visited.has(epochId)) {
      return;
    }
    visiting.add(epochId);
    epochsById.get(epochId)?.dependsOn.forEach(visitEpoch);
    visiting.delete(epochId);
    visited.add(epochId);
  };
  epochsById.forEach(epoch => visitEpoch(epoch.epochId));
  preparedPlan.artifactReceipts.forEach(receipt => {
    const isMaterializationOnlyArchive = receipt.materialization.kind === 'archive';
    if (coveredReceiptIds.has(receipt.artifactId) && isMaterializationOnlyArchive) {
      receiptError(`Prepared archive ${receipt.artifactId} must not be assigned to an epoch`);
    }
    if (!coveredReceiptIds.has(receipt.artifactId) && !isMaterializationOnlyArchive) {
      receiptError(`Prepared artifact ${receipt.artifactId} is not assigned to an epoch`);
    }
  });
};

export const validatePreparedPlan = (value: unknown): PreparedPlan => {
  const preparedPlan = validatePreparedPlanContract(value);
  assertPreparedRelationships(preparedPlan);
  return preparedPlan;
};

export const prepareFirmwareUpdate = ({
  plan: planValue,
  artifactReceipts,
}: PrepareFirmwareUpdateInput): PreparedPlan => {
  const plan = validateFirmwareUpdatePlan(planValue);
  const receiptCandidate = {
    schemaVersion: FIRMWARE_PREPARED_PLAN_SCHEMA_VERSION,
    planId: plan.planId,
    planDigest: plan.planDigest,
    manifestSnapshotDigest: plan.manifestSnapshotDigest,
    catalogEpoch: plan.catalogEpoch,
    networkPolicy: 'forbid',
    device: { ...plan.device },
    artifactReceipts,
    epochs: plan.epochs.map(epoch => ({
      ...epoch,
      artifactIds: [...epoch.artifactIds],
      dependsOn: [...epoch.dependsOn],
      targetIds: [...epoch.targetIds],
    })),
    expectedFinalStates: plan.expectedFinalStates.map(state => ({ ...state })),
  };

  let preparedPlan: PreparedPlan;
  try {
    const contractPreparedPlan = validatePreparedPlanContract(receiptCandidate);
    const binding = assertReceiptMatchesPlan(plan, contractPreparedPlan.artifactReceipts);
    preparedPlan = validatePreparedPlan({
      ...contractPreparedPlan,
      artifactReceipts: binding.orderedReceipts,
      epochs: expandArchiveEpochs(plan, binding.expansions),
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'errorCode' in error &&
      error.errorCode === FirmwareUpdateErrorCode.FirmwareArtifactReceiptMismatch
    ) {
      throw error;
    }
    const detail =
      error instanceof Error ? error.message : 'Firmware artifact receipts are invalid';
    return receiptError(detail);
  }

  const immutablePreparedPlan: PreparedPlan = {
    ...preparedPlan,
    artifactReceipts: preparedPlan.artifactReceipts.map(receipt => ({
      ...receipt,
      sha256: receipt.sha256.toLowerCase(),
      materialization: { ...receipt.materialization },
    })),
  };
  validatePreparedPlan(immutablePreparedPlan);
  return deepFreezeFirmwareValue(immutablePreparedPlan);
};
