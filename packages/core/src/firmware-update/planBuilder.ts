import semver from 'semver';

import { FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION, type FirmwareManifestModeKind } from './capabilities';
import { deepFreezeFirmwareValue, sha256CanonicalFirmwareJson } from './canonical';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';
import { validateFirmwareManifestSnapshot } from './manifestValidator';
import { computeFirmwareUpdatePlanDigest, validateFirmwareUpdatePlan } from './planDigest';
import { findLatestSemanticRelease } from '../utils/release';
import {
  PROTOCOL_V2_RESOURCE_BUNDLE_PATHS,
  normalizeProtocolV2ResourceBundleName,
} from '../protocols/protocol-v2/firmware';

import type {
  FirmwareArtifactRequirement,
  FirmwareDeviceSnapshot,
  FirmwareExpectedTargetState,
  FirmwareManifestRelease,
  FirmwareReleaseChannel,
  FirmwareTarget,
  FirmwareUpdateEpoch,
  FirmwareUpdatePlan,
} from './contracts';

export interface BuildFirmwareUpdatePlanInput {
  manifestSnapshot: unknown;
  manifestMode: FirmwareManifestModeKind;
  deviceSnapshot: FirmwareDeviceSnapshot;
  channel: FirmwareReleaseChannel;
}

export interface BuildFirmwareUpdatePlanBundleInput
  extends Omit<BuildFirmwareUpdatePlanInput, 'manifestSnapshot'> {
  manifestSnapshots: readonly unknown[];
}

const REQUIRED_PRO2_TARGETS = [
  'bootloader',
  'p1',
  'p2',
  'coprocessor',
  'se01',
  'se02',
  'se03',
  'se04',
] as const satisfies readonly FirmwareTarget[];

const PRO2_TARGET_ORDER = [
  ...REQUIRED_PRO2_TARGETS,
  'resource',
] as const satisfies readonly FirmwareTarget[];

const REQUIRED_PRO2_RESOURCE_BUNDLES = Object.keys(PROTOCOL_V2_RESOURCE_BUNDLE_PATHS);

const DEFAULT_TARGET_ORDER = [
  'resource',
  'bootloader',
  'firmware',
  'ble',
  'p1',
  'p2',
  'coprocessor',
  'se01',
  'se02',
  'se03',
  'se04',
] as const satisfies readonly FirmwareTarget[];

const VERSIONED_PRIMARY_TARGETS = new Set<FirmwareTarget>(['firmware', 'ble', 'bootloader']);

const getTargetVersion = (
  artifact: FirmwareArtifactRequirement,
  release: FirmwareManifestRelease
): string | undefined =>
  artifact.targetVersion ?? (artifact.target === 'firmware' ? release.version : undefined);

const planError = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwarePlanInvalid, detail, {
    detail,
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertExactInput: (
  input: unknown
) => asserts input is BuildFirmwareUpdatePlanInput = input => {
  if (!isRecord(input)) {
    return planError('PlanBuilder input must be an object');
  }
  const allowedKeys = new Set(['manifestSnapshot', 'manifestMode', 'deviceSnapshot', 'channel']);
  const unknownKey = Object.keys(input).find(key => !allowedKeys.has(key));
  if (unknownKey) {
    return planError(`PlanBuilder input ${unknownKey} is not allowed`);
  }
  if (input.manifestMode !== 'external-only' && input.manifestMode !== 'sdk-managed') {
    return planError('PlanBuilder manifestMode is unsupported');
  }
  if (input.channel !== 'stable' && input.channel !== 'pre-release') {
    return planError('PlanBuilder channel is unsupported');
  }
  const { deviceSnapshot } = input;
  if (!isRecord(deviceSnapshot)) {
    return planError('PlanBuilder deviceSnapshot must be an object');
  }
  const deviceKeys = new Set(['identity', 'model', 'firmwareType', 'currentVersions']);
  const unknownDeviceKey = Object.keys(deviceSnapshot).find(key => !deviceKeys.has(key));
  if (unknownDeviceKey) {
    return planError(`PlanBuilder deviceSnapshot.${unknownDeviceKey} is not allowed`);
  }
  ['identity', 'model', 'firmwareType'].forEach(key => {
    const value = deviceSnapshot[key];
    if (typeof value !== 'string' || value.length === 0) {
      planError(`PlanBuilder deviceSnapshot.${key} must be a non-empty string`);
    }
  });
  if (!isRecord(deviceSnapshot.currentVersions)) {
    return planError('PlanBuilder deviceSnapshot.currentVersions must be an object');
  }
};

const cloneArtifact = (artifact: FirmwareArtifactRequirement): FirmwareArtifactRequirement => ({
  artifactId: artifact.artifactId,
  role: artifact.role,
  sourceUrls: [...artifact.sourceUrls],
  ...(artifact.expectedSize === undefined ? {} : { expectedSize: artifact.expectedSize }),
  ...(artifact.expectedSha256 === undefined ? {} : { expectedSha256: artifact.expectedSha256 }),
  integrity: artifact.integrity,
  container: { ...artifact.container },
  target: artifact.target,
  ...(artifact.targetVersion === undefined ? {} : { targetVersion: artifact.targetVersion }),
  devicePathRule: { ...artifact.devicePathRule },
  dependsOn: [...artifact.dependsOn],
});

const selectRelease = (
  releases: readonly FirmwareManifestRelease[],
  artifactCatalog: readonly FirmwareArtifactRequirement[],
  input: BuildFirmwareUpdatePlanInput
): FirmwareManifestRelease => {
  const artifactsById = new Map(artifactCatalog.map(artifact => [artifact.artifactId, artifact]));
  const matches = releases.filter(release => {
    const releaseArtifacts = release.artifactIds
      .map(artifactId => artifactsById.get(artifactId))
      .filter((artifact): artifact is FirmwareArtifactRequirement => artifact !== undefined);
    const isReviewedUniversalBleRelease =
      release.firmwareType === 'universal' &&
      releaseArtifacts.length > 0 &&
      releaseArtifacts.length === release.artifactIds.length &&
      releaseArtifacts.every(artifact => artifact.target === 'ble');
    const firmwareTypeMatches =
      isReviewedUniversalBleRelease || release.firmwareType === input.deviceSnapshot.firmwareType;
    const hasTargetUpgrade =
      input.deviceSnapshot.model === 'pro2'
        ? !input.deviceSnapshot.currentVersions.firmware ||
          semver.gt(release.version, input.deviceSnapshot.currentVersions.firmware)
        : releaseArtifacts.some(artifact => {
            if (!VERSIONED_PRIMARY_TARGETS.has(artifact.target)) {
              return false;
            }
            const targetVersion = getTargetVersion(artifact, release);
            if (!targetVersion || !semver.valid(targetVersion)) {
              return false;
            }
            const currentVersion = input.deviceSnapshot.currentVersions[artifact.target];
            return (
              !currentVersion ||
              !semver.valid(currentVersion) ||
              semver.gt(targetVersion, currentVersion)
            );
          });
    return (
      release.deviceModel === input.deviceSnapshot.model &&
      firmwareTypeMatches &&
      release.channel === input.channel &&
      hasTargetUpgrade
    );
  });
  const release = findLatestSemanticRelease(matches);
  if (!release) {
    return planError(
      `No firmware release matches ${input.deviceSnapshot.model}/${input.deviceSnapshot.firmwareType}/${input.channel}`
    );
  }
  return release;
};

const collectReleaseArtifacts = (
  release: FirmwareManifestRelease,
  artifactCatalog: readonly FirmwareArtifactRequirement[],
  model: string
) => {
  const artifactsById = new Map(artifactCatalog.map(artifact => [artifact.artifactId, artifact]));
  const targetOrder = model === 'pro2' ? PRO2_TARGET_ORDER : DEFAULT_TARGET_ORDER;
  const targetRank = new Map(targetOrder.map((target, index) => [target, index]));
  const orderedReleaseIds = [...release.artifactIds].sort((leftId, rightId) => {
    const left = artifactsById.get(leftId);
    const right = artifactsById.get(rightId);
    if (!left || !right) {
      return leftId.localeCompare(rightId);
    }
    return (
      (targetRank.get(left.target) ?? Number.MAX_SAFE_INTEGER) -
        (targetRank.get(right.target) ?? Number.MAX_SAFE_INTEGER) ||
      left.artifactId.localeCompare(right.artifactId)
    );
  });
  const visited = new Set<string>();
  const artifacts: FirmwareArtifactRequirement[] = [];
  const visit = (artifactId: string) => {
    if (visited.has(artifactId)) {
      return;
    }
    const artifact = artifactsById.get(artifactId);
    if (!artifact) {
      return planError(`Release ${release.releaseId} references missing artifact ${artifactId}`);
    }
    if (model !== 'pro2') {
      [...artifact.dependsOn].sort().forEach(visit);
    }
    visited.add(artifactId);
    artifacts.push(cloneArtifact(artifact));
  };
  orderedReleaseIds.forEach(visit);

  if (model === 'pro2') {
    const allowedTargets = new Set<FirmwareTarget>(PRO2_TARGET_ORDER);
    const unsupportedArtifact = artifacts.find(artifact => !allowedTargets.has(artifact.target));
    if (unsupportedArtifact) {
      planError(`Pro2 release contains unsupported target ${unsupportedArtifact.target}`);
    }
    REQUIRED_PRO2_TARGETS.forEach(target => {
      const matchingArtifacts = artifacts.filter(artifact => artifact.target === target);
      if (matchingArtifacts.length !== 1) {
        planError(`Pro2 release must contain exactly one ${target} artifact`);
      }
    });
    const resourceArtifacts = artifacts.filter(artifact => artifact.target === 'resource');
    resourceArtifacts.forEach(artifact => {
      if (artifact.role !== 'resource-bundle' || artifact.container.kind !== 'raw') {
        planError(
          `Pro2 resource ${artifact.artifactId} must be a raw SDK-generated resource bundle`
        );
      }
      const { devicePathRule } = artifact;
      if (devicePathRule.kind === 'sdk-generated') {
        normalizeProtocolV2ResourceBundleName(devicePathRule.logicalName);
      } else {
        planError(`Pro2 resource ${artifact.artifactId} must use an SDK-generated device path`);
      }
    });
    if (resourceArtifacts.length > 0) {
      REQUIRED_PRO2_RESOURCE_BUNDLES.forEach(logicalName => {
        const matchingArtifacts = resourceArtifacts.filter(
          artifact =>
            artifact.devicePathRule.kind === 'sdk-generated' &&
            normalizeProtocolV2ResourceBundleName(artifact.devicePathRule.logicalName) ===
              logicalName
        );
        if (matchingArtifacts.length !== 1) {
          planError(`Pro2 release must contain exactly one ${logicalName} resource bundle`);
        }
      });
      if (resourceArtifacts.length !== REQUIRED_PRO2_RESOURCE_BUNDLES.length) {
        planError('Pro2 release contains duplicate or unsupported resource bundles');
      }
    }
    artifacts.sort(
      (left, right) =>
        PRO2_TARGET_ORDER.indexOf(left.target as (typeof PRO2_TARGET_ORDER)[number]) -
          PRO2_TARGET_ORDER.indexOf(right.target as (typeof PRO2_TARGET_ORDER)[number]) ||
        left.artifactId.localeCompare(right.artifactId)
    );
    const artifactsByTarget = new Map(
      artifacts.map(artifact => [artifact.target, artifact.artifactId])
    );
    const bootloaderArtifactId = artifactsByTarget.get('bootloader');
    if (!bootloaderArtifactId) {
      return planError('Pro2 release is missing the bootloader dependency root');
    }
    return artifacts.map(artifact => {
      let dependsOn: string[];
      if (artifact.target === 'bootloader' || artifact.target === 'resource') {
        dependsOn = [];
      } else {
        dependsOn = [bootloaderArtifactId];
      }
      return {
        ...artifact,
        dependsOn,
      };
    });
  }
  return artifacts;
};

const pruneCurrentTargetArtifacts = (
  artifacts: readonly FirmwareArtifactRequirement[],
  release: FirmwareManifestRelease,
  deviceSnapshot: FirmwareDeviceSnapshot
): FirmwareArtifactRequirement[] => {
  if (deviceSnapshot.model === 'pro2') {
    return [...artifacts];
  }
  const prunedArtifactIds = new Set(
    artifacts
      .filter(artifact => {
        if (!VERSIONED_PRIMARY_TARGETS.has(artifact.target)) {
          return false;
        }
        const targetVersion = getTargetVersion(artifact, release);
        const currentVersion = deviceSnapshot.currentVersions[artifact.target];
        if (
          !targetVersion ||
          !currentVersion ||
          !semver.valid(targetVersion) ||
          !semver.valid(currentVersion)
        ) {
          return false;
        }
        return semver.lte(targetVersion, currentVersion);
      })
      .map(artifact => artifact.artifactId)
  );
  const dependencyConflict = artifacts.find(
    artifact =>
      !prunedArtifactIds.has(artifact.artifactId) &&
      artifact.dependsOn.some(dependencyId => prunedArtifactIds.has(dependencyId))
  );
  if (dependencyConflict) {
    return planError(
      `Plan artifact ${dependencyConflict.artifactId} depends on an up-to-date target artifact`
    );
  }
  return artifacts.filter(artifact => !prunedArtifactIds.has(artifact.artifactId));
};

const uniqueTargets = (artifacts: readonly FirmwareArtifactRequirement[]): FirmwareTarget[] => [
  ...new Set(artifacts.map(artifact => artifact.target)),
];

const buildEpochs = (artifacts: readonly FirmwareArtifactRequirement[]): FirmwareUpdateEpoch[] => {
  const epochs: FirmwareUpdateEpoch[] = [];
  let previousEpochId: string | undefined;
  const appendEpoch = (
    epochId: string,
    kind: FirmwareUpdateEpoch['kind'],
    epochArtifacts: readonly FirmwareArtifactRequirement[],
    targetIds = uniqueTargets(epochArtifacts)
  ) => {
    epochs.push({
      epochId,
      kind,
      artifactIds: epochArtifacts.map(artifact => artifact.artifactId),
      dependsOn: previousEpochId ? [previousEpochId] : [],
      targetIds,
    });
    previousEpochId = epochId;
  };

  const resourceArtifacts = artifacts.filter(
    artifact =>
      artifact.target === 'resource' ||
      artifact.role === 'resource' ||
      artifact.role === 'resource-bundle'
  );
  const bootloaderArtifacts = artifacts.filter(artifact => artifact.target === 'bootloader');
  const componentArtifacts = artifacts.filter(
    artifact => !resourceArtifacts.includes(artifact) && !bootloaderArtifacts.includes(artifact)
  );

  if (resourceArtifacts.length > 0) {
    appendEpoch('resource-sync', 'resource-sync', resourceArtifacts);
  }
  if (bootloaderArtifacts.length > 0) {
    appendEpoch('bootloader-install', 'bootloader-install', bootloaderArtifacts);
    appendEpoch('bootloader-verify', 'bootloader-verify', [], ['bootloader']);
  }
  if (componentArtifacts.length > 0) {
    appendEpoch('component-install', 'component-install', componentArtifacts);
  }
  appendEpoch('final-verify', 'final-verify', [], uniqueTargets(artifacts));
  return epochs;
};

const buildExpectedFinalStates = (
  artifacts: readonly FirmwareArtifactRequirement[],
  release: FirmwareManifestRelease
): FirmwareExpectedTargetState[] => {
  const states = new Map<FirmwareTarget, FirmwareExpectedTargetState>();
  const resourceArtifacts = artifacts.filter(artifact => artifact.target === 'resource');
  artifacts
    .filter(artifact => artifact.target !== 'resource')
    .forEach(artifact => {
      const version =
        artifact.targetVersion ?? (artifact.target === 'firmware' ? release.version : undefined);
      const sha256 = artifact.expectedSha256;
      if (!version && !sha256) {
        return;
      }
      const previous = states.get(artifact.target);
      if (
        previous &&
        ((version && previous.version && previous.version !== version) ||
          (sha256 && previous.sha256 && previous.sha256 !== sha256))
      ) {
        planError(`Conflicting expected final state for target ${artifact.target}`);
      }
      states.set(artifact.target, {
        target: artifact.target,
        ...(version ? { version } : {}),
        ...(sha256 ? { sha256 } : {}),
      });
    });
  if (resourceArtifacts.length > 0) {
    states.set('resource', {
      target: 'resource',
      sha256: sha256CanonicalFirmwareJson(
        resourceArtifacts.map(artifact => ({
          artifactId: artifact.artifactId,
          sha256: artifact.expectedSha256 ?? null,
        }))
      ),
    });
  }
  return [...states.values()];
};

export const buildFirmwareUpdatePlan = (
  input: BuildFirmwareUpdatePlanInput
): FirmwareUpdatePlan => {
  assertExactInput(input);
  const manifestSnapshot = validateFirmwareManifestSnapshot(input.manifestSnapshot, {
    manifestMode: input.manifestMode,
  });
  const release = selectRelease(manifestSnapshot.releases, manifestSnapshot.artifactCatalog, input);
  const artifacts = pruneCurrentTargetArtifacts(
    collectReleaseArtifacts(release, manifestSnapshot.artifactCatalog, input.deviceSnapshot.model),
    release,
    input.deviceSnapshot
  );
  const planWithoutDigest = {
    schemaVersion: FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION,
    planId: release.releaseId,
    manifestSnapshotDigest: manifestSnapshot.snapshotDigest,
    manifestMode: input.manifestMode,
    catalogEpoch: manifestSnapshot.catalogEpoch,
    device: {
      identity: input.deviceSnapshot.identity,
      model: input.deviceSnapshot.model,
      firmwareType: input.deviceSnapshot.firmwareType,
    },
    artifacts,
    epochs: buildEpochs(artifacts),
    expectedFinalStates: buildExpectedFinalStates(artifacts, release),
  } satisfies Omit<FirmwareUpdatePlan, 'planDigest'>;
  const plan: FirmwareUpdatePlan = {
    ...planWithoutDigest,
    planDigest: computeFirmwareUpdatePlanDigest(planWithoutDigest),
  };
  validateFirmwareUpdatePlan(plan);
  return deepFreezeFirmwareValue(plan);
};

type FirmwareUpdateFamily = 'firmware' | 'ble';

const getUpdateFamilies = (
  artifacts: readonly FirmwareArtifactRequirement[]
): FirmwareUpdateFamily[] => [
  ...(artifacts.some(artifact => artifact.target !== 'ble') ? (['firmware'] as const) : []),
  ...(artifacts.some(artifact => artifact.target === 'ble') ? (['ble'] as const) : []),
];

const assertBundleInput: (
  input: unknown
) => asserts input is BuildFirmwareUpdatePlanBundleInput = input => {
  if (!isRecord(input)) {
    return planError('PlanBundle input must be an object');
  }
  const allowedKeys = new Set(['manifestSnapshots', 'manifestMode', 'deviceSnapshot', 'channel']);
  const unknownKey = Object.keys(input).find(key => !allowedKeys.has(key));
  if (unknownKey) {
    return planError(`PlanBundle input ${unknownKey} is not allowed`);
  }
  if (!Array.isArray(input.manifestSnapshots) || input.manifestSnapshots.length === 0) {
    return planError('PlanBundle manifestSnapshots must be a non-empty array');
  }
  assertExactInput({
    manifestSnapshot: input.manifestSnapshots[0],
    manifestMode: input.manifestMode,
    deviceSnapshot: input.deviceSnapshot,
    channel: input.channel,
  });
};

export const buildFirmwareUpdatePlanBundle = (
  input: BuildFirmwareUpdatePlanBundleInput
): FirmwareUpdatePlan => {
  assertBundleInput(input);
  const buildSelectedPlan = (manifestSnapshot: unknown) =>
    buildFirmwareUpdatePlan({
      manifestSnapshot,
      manifestMode: input.manifestMode,
      deviceSnapshot: input.deviceSnapshot,
      channel: input.channel,
    });
  if (input.manifestSnapshots.length === 1) {
    return buildSelectedPlan(input.manifestSnapshots[0]);
  }

  const selectedPlans = input.manifestSnapshots.map(buildSelectedPlan);
  const catalogEpoch = selectedPlans[0]?.catalogEpoch;
  if (
    catalogEpoch === undefined ||
    selectedPlans.some(plan => plan.catalogEpoch !== catalogEpoch)
  ) {
    return planError('PlanBundle manifest snapshots must use the same catalogEpoch');
  }

  const families = new Set<FirmwareUpdateFamily>();
  selectedPlans.forEach(plan => {
    getUpdateFamilies(plan.artifacts).forEach(family => {
      if (families.has(family)) {
        planError(`PlanBundle contains duplicate ${family} update family`);
      }
      families.add(family);
    });
  });
  const orderedPlans = [...selectedPlans].sort((left, right) => {
    const leftRank = getUpdateFamilies(left.artifacts).includes('firmware') ? 0 : 1;
    const rightRank = getUpdateFamilies(right.artifacts).includes('firmware') ? 0 : 1;
    return (
      leftRank - rightRank ||
      left.planId.localeCompare(right.planId) ||
      left.manifestSnapshotDigest.localeCompare(right.manifestSnapshotDigest)
    );
  });

  const artifacts = orderedPlans.flatMap(plan => plan.artifacts);
  if (new Set(artifacts.map(artifact => artifact.artifactId)).size !== artifacts.length) {
    return planError('PlanBundle contains duplicate artifactId values');
  }
  const expectedFinalStates = orderedPlans.flatMap(plan => plan.expectedFinalStates);
  if (new Set(expectedFinalStates.map(state => state.target)).size !== expectedFinalStates.length) {
    return planError('PlanBundle contains duplicate expected final targets');
  }
  const manifestSnapshotDigest = sha256CanonicalFirmwareJson({
    schemaVersion: FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION,
    manifestSnapshotDigests: selectedPlans.map(plan => plan.manifestSnapshotDigest).sort(),
  });
  const bundleIdentity = sha256CanonicalFirmwareJson({
    manifestSnapshotDigest,
    selectedPlanIds: orderedPlans.map(plan => plan.planId),
  });
  const planWithoutDigest = {
    schemaVersion: FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION,
    planId: `firmware-plan-bundle-${bundleIdentity.slice(0, 24)}`,
    manifestSnapshotDigest,
    manifestMode: input.manifestMode,
    catalogEpoch,
    device: {
      identity: input.deviceSnapshot.identity,
      model: input.deviceSnapshot.model,
      firmwareType: input.deviceSnapshot.firmwareType,
    },
    artifacts,
    epochs: buildEpochs(artifacts),
    expectedFinalStates,
  } satisfies Omit<FirmwareUpdatePlan, 'planDigest'>;
  const plan: FirmwareUpdatePlan = {
    ...planWithoutDigest,
    planDigest: computeFirmwareUpdatePlanDigest(planWithoutDigest),
  };
  validateFirmwareUpdatePlan(plan);
  return deepFreezeFirmwareValue(plan);
};
