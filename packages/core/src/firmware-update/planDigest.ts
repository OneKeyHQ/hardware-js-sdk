import { sha256CanonicalFirmwareJson } from './canonical';
import { validateFirmwareUpdatePlanContract } from './contracts';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';

import type { FirmwareUpdatePlan } from './contracts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const planError = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwarePlanInvalid, detail, {
    detail,
  });
};

const withoutPlanDigest = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) {
    return planError('Firmware update plan must be an object');
  }
  const { planDigest: _planDigest, ...digestInput } = value;
  return digestInput;
};

export const computeFirmwareUpdatePlanDigest = (value: unknown): string =>
  sha256CanonicalFirmwareJson(withoutPlanDigest(value));

const assertPlanRelationships = (plan: FirmwareUpdatePlan) => {
  const artifactsById = new Map(plan.artifacts.map(artifact => [artifact.artifactId, artifact]));
  const epochsById = new Map(plan.epochs.map(epoch => [epoch.epochId, epoch]));
  plan.artifacts.forEach(artifact => {
    artifact.dependsOn.forEach(dependencyId => {
      if (!artifactsById.has(dependencyId)) {
        planError(`Plan artifact ${artifact.artifactId} has missing dependency ${dependencyId}`);
      }
    });
  });
  const assertAcyclic = <T>(
    valuesById: ReadonlyMap<string, T>,
    getDependencies: (value: T) => readonly string[],
    label: string
  ) => {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (id: string) => {
      if (visiting.has(id)) {
        planError(`Plan ${label} dependency cycle includes ${id}`);
      }
      if (visited.has(id)) {
        return;
      }
      visiting.add(id);
      getDependencies(valuesById.get(id) as T).forEach(visit);
      visiting.delete(id);
      visited.add(id);
    };
    valuesById.forEach((_value, id) => visit(id));
  };
  assertAcyclic(artifactsById, artifact => artifact.dependsOn, 'artifact');

  const coveredArtifactIds = new Set<string>();
  plan.epochs.forEach(epoch => {
    epoch.artifactIds.forEach(artifactId => {
      if (!artifactsById.has(artifactId)) {
        planError(`Plan epoch ${epoch.epochId} references missing artifact ${artifactId}`);
      }
      if (coveredArtifactIds.has(artifactId)) {
        planError(`Plan artifact ${artifactId} is assigned to more than one epoch`);
      }
      coveredArtifactIds.add(artifactId);
    });
    epoch.dependsOn.forEach(dependencyId => {
      if (!epochsById.has(dependencyId)) {
        planError(`Plan epoch ${epoch.epochId} references missing epoch ${dependencyId}`);
      }
    });
  });
  assertAcyclic(epochsById, epoch => epoch.dependsOn, 'epoch');
  plan.artifacts.forEach(artifact => {
    if (!coveredArtifactIds.has(artifact.artifactId)) {
      planError(`Plan artifact ${artifact.artifactId} is not assigned to an epoch`);
    }
  });
};

export const validateFirmwareUpdatePlan = (value: unknown): FirmwareUpdatePlan => {
  const plan = validateFirmwareUpdatePlanContract(value);
  assertPlanRelationships(plan);
  const computedDigest = computeFirmwareUpdatePlanDigest(plan);
  if (computedDigest !== plan.planDigest.toLowerCase()) {
    throw createFirmwareUpdateError(
      FirmwareUpdateErrorCode.FirmwarePlanDigestMismatch,
      'Firmware update plan digest does not match its canonical payload',
      {
        expectedPlanDigest: plan.planDigest,
        computedPlanDigest: computedDigest,
      }
    );
  }
  return plan;
};
