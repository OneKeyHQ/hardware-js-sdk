import semver from 'semver';

import { sha256CanonicalFirmwareJson } from './canonical';
import { validateFirmwareManifestSnapshotContract } from './contracts';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';

import type { FirmwareArtifactRequirement, FirmwareManifestSnapshot } from './contracts';
import type { FirmwareManifestModeKind } from './capabilities';

const MAX_FIRMWARE_ARTIFACT_BYTES = 512 * 1024 * 1024;

export interface FirmwareManifestValidationOptions {
  manifestMode?: FirmwareManifestModeKind;
}

const manifestError = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareManifestInvalid, detail, {
    detail,
  });
};

const manifestIntegrityError = (detail: string): never => {
  throw createFirmwareUpdateError(
    FirmwareUpdateErrorCode.FirmwareManifestIntegrityMissing,
    detail,
    { detail }
  );
};

const manifestModeError = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareManifestModeMismatch, detail, {
    detail,
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const withoutSnapshotDigest = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new TypeError('Firmware manifest snapshot must be an object');
  }
  const { snapshotDigest: _snapshotDigest, ...digestInput } = value;
  return digestInput;
};

export const computeFirmwareManifestSnapshotDigest = (value: unknown): string =>
  sha256CanonicalFirmwareJson(withoutSnapshotDigest(value));

const inferManifestMode = (source: FirmwareManifestSnapshot['source']): FirmwareManifestModeKind =>
  source === 'app-bundled-catalog' || source === 'signed-remote-config'
    ? 'external-only'
    : 'sdk-managed';

const assertIntegrityAdmission = (value: unknown, manifestMode: FirmwareManifestModeKind) => {
  if (!isRecord(value) || !Array.isArray(value.artifactCatalog)) {
    return;
  }
  value.artifactCatalog.forEach((artifactValue, index) => {
    if (!isRecord(artifactValue)) {
      return;
    }
    const permitsDeferredIntegrity =
      manifestMode === 'sdk-managed' && artifactValue.integrity === 'legacy-unverified';
    if (permitsDeferredIntegrity) {
      return;
    }
    if (manifestMode === 'external-only' && artifactValue.integrity === 'legacy-unverified') {
      manifestIntegrityError(
        `manifestSnapshot.artifactCatalog[${index}] cannot be legacy-unverified in external-only mode`
      );
    }
    if (
      !Number.isSafeInteger(artifactValue.expectedSize) ||
      Number(artifactValue.expectedSize) <= 0 ||
      Number(artifactValue.expectedSize) > MAX_FIRMWARE_ARTIFACT_BYTES
    ) {
      manifestIntegrityError(
        `manifestSnapshot.artifactCatalog[${index}].expectedSize must be a positive safe integer`
      );
    }
    if (
      typeof artifactValue.expectedSha256 !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(artifactValue.expectedSha256)
    ) {
      manifestIntegrityError(
        `manifestSnapshot.artifactCatalog[${index}].expectedSha256 must be a full SHA-256 digest`
      );
    }
  });
};

const assertArtifactRelationships = (artifacts: readonly FirmwareArtifactRequirement[]) => {
  const artifactsById = new Map(artifacts.map(artifact => [artifact.artifactId, artifact]));
  artifacts.forEach(artifact => {
    artifact.dependsOn.forEach(dependencyId => {
      if (!artifactsById.has(dependencyId)) {
        manifestError(
          `Artifact ${artifact.artifactId} depends on missing artifact ${dependencyId}`
        );
      }
      if (dependencyId === artifact.artifactId) {
        manifestError(`Artifact ${artifact.artifactId} cannot depend on itself`);
      }
    });
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (artifactId: string) => {
    if (visiting.has(artifactId)) {
      manifestError(`Artifact dependency cycle includes ${artifactId}`);
    }
    if (visited.has(artifactId)) {
      return;
    }
    visiting.add(artifactId);
    artifactsById.get(artifactId)?.dependsOn.forEach(visit);
    visiting.delete(artifactId);
    visited.add(artifactId);
  };
  artifacts.forEach(artifact => visit(artifact.artifactId));
  return artifactsById;
};

const assertReleaseCatalog = (snapshot: FirmwareManifestSnapshot) => {
  const artifactsById = assertArtifactRelationships(snapshot.artifactCatalog);
  const releaseKeys = new Set<string>();
  snapshot.releases.forEach(release => {
    if (!semver.valid(release.version)) {
      manifestError(`Release ${release.releaseId} has an invalid semantic version`);
    }
    const releaseKey = [
      release.deviceModel,
      release.firmwareType,
      release.channel,
      release.version,
    ].join('\0');
    if (releaseKeys.has(releaseKey)) {
      manifestError(
        `Duplicate release version ${release.version} for ${release.deviceModel}/${release.firmwareType}/${release.channel}`
      );
    }
    releaseKeys.add(releaseKey);
    release.artifactIds.forEach(artifactId => {
      if (!artifactsById.has(artifactId)) {
        manifestError(`Release ${release.releaseId} references missing artifact ${artifactId}`);
      }
    });
  });
};

const isFirmwareErrorCode = (error: unknown, errorCode: number) =>
  isRecord(error) && error.errorCode === errorCode;

export const validateFirmwareManifestSnapshot = (
  value: unknown,
  options: FirmwareManifestValidationOptions = {}
): FirmwareManifestSnapshot => {
  const source =
    isRecord(value) && typeof value.source === 'string'
      ? (value.source as FirmwareManifestSnapshot['source'])
      : undefined;
  const manifestMode =
    options.manifestMode ??
    (source ? inferManifestMode(source) : ('external-only' as FirmwareManifestModeKind));

  assertIntegrityAdmission(value, manifestMode);

  let snapshot: FirmwareManifestSnapshot;
  try {
    snapshot = validateFirmwareManifestSnapshotContract(value);
  } catch (error) {
    if (
      isFirmwareErrorCode(error, FirmwareUpdateErrorCode.FirmwareManifestIntegrityMissing) ||
      isFirmwareErrorCode(error, FirmwareUpdateErrorCode.FirmwareManifestModeMismatch)
    ) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : 'Firmware manifest validation failed';
    return manifestError(detail);
  }

  if (inferManifestMode(snapshot.source) !== manifestMode) {
    manifestModeError(`Manifest source ${snapshot.source} is not valid for mode ${manifestMode}`);
  }
  assertReleaseCatalog(snapshot);
  const computedDigest = computeFirmwareManifestSnapshotDigest(snapshot);
  if (computedDigest !== snapshot.snapshotDigest.toLowerCase()) {
    manifestError('Manifest snapshot digest does not match its canonical payload');
  }
  return snapshot;
};
