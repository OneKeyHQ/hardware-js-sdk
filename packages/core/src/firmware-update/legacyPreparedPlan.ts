import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import { FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION } from './capabilities';
import { createFirmwareArchiveEntryArtifactId } from './archivePlan';
import { sha256CanonicalFirmwareJson } from './canonical';
import { FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY } from './contracts';
import { computeFirmwareUpdatePlanDigest } from './planDigest';
import { prepareFirmwareUpdate } from './preparedPlanValidator';

import type {
  FirmwareArtifactReceipt,
  FirmwareArtifactRequirement,
  FirmwareTarget,
  FirmwareUpdateEpoch,
  FirmwareUpdatePlan,
  PreparedPlan,
} from './contracts';

export interface CreateLegacyMemoryPreparedPlanInput {
  binary: ArrayBuffer;
  device: {
    identity: string;
    model: string;
    firmwareType?: string;
  };
  updateType: 'firmware' | 'ble';
  isUpdateBootloader?: boolean;
  targetVersion?: string;
}

export interface LegacyMemoryPreparedPlan {
  preparedPlan: PreparedPlan;
  receipt: FirmwareArtifactReceipt;
}

export interface LegacyV3ResourceEntry {
  binary: ArrayBuffer;
  entryId: string;
  logicalName: string;
}

export interface CreateLegacyV3MemoryPreparedPlanInput {
  device: {
    identity: string;
    model: string;
    firmwareType?: string;
  };
  resourceArchive?: ArrayBuffer;
  resourceEntries?: readonly LegacyV3ResourceEntry[];
  bootloaderBinary?: ArrayBuffer;
  bootloaderVersion?: string;
  firmwareBinary?: ArrayBuffer;
  firmwareVersion?: string;
  bleBinary?: ArrayBuffer;
  bleVersion?: string;
}

export interface LegacyV3MemoryPreparedPlan {
  preparedPlan: PreparedPlan;
  binariesByArtifactRef: ReadonlyMap<string, ArrayBuffer>;
}

export const createLegacyMemoryPreparedPlan = ({
  binary,
  device,
  updateType,
  isUpdateBootloader,
  targetVersion,
}: CreateLegacyMemoryPreparedPlanInput): LegacyMemoryPreparedPlan => {
  let target: FirmwareTarget = updateType === 'ble' ? 'ble' : 'firmware';
  if (isUpdateBootloader) {
    target = 'bootloader';
  }
  const digest = bytesToHex(sha256(new Uint8Array(binary)));
  const artifactId = `legacy-memory-${target}-${digest.slice(0, 16)}`;
  const epochId = target === 'bootloader' ? 'bootloader-install' : 'component-install';
  const planWithoutDigest = {
    schemaVersion: FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION,
    planId: `legacy-memory-plan-${target}-${digest.slice(0, 16)}`,
    manifestSnapshotDigest: sha256CanonicalFirmwareJson({
      kind: 'legacy-memory',
      target,
      digest,
      size: binary.byteLength,
      targetVersion: targetVersion ?? null,
    }),
    manifestMode: 'sdk-managed' as const,
    catalogEpoch: 0,
    device: { ...device },
    artifacts: [
      {
        artifactId,
        role: target,
        sourceUrls: [`https://legacy-memory.invalid/${artifactId}.bin`],
        expectedSize: binary.byteLength,
        expectedSha256: digest,
        integrity: 'legacy-unverified' as const,
        container: { kind: 'raw' as const },
        target,
        ...(targetVersion ? { targetVersion } : {}),
        devicePathRule: { kind: 'none' as const },
        dependsOn: [],
      },
    ],
    epochs: [
      {
        epochId,
        kind:
          target === 'bootloader'
            ? ('bootloader-install' as const)
            : ('component-install' as const),
        artifactIds: [artifactId],
        dependsOn: [],
        targetIds: [target],
      },
      {
        epochId: 'final-verify',
        kind: 'final-verify' as const,
        artifactIds: [],
        dependsOn: [epochId],
        targetIds: [target],
      },
    ],
    expectedFinalStates: [
      {
        target,
        sha256: digest,
      },
    ],
  };
  const plan: FirmwareUpdatePlan = {
    ...planWithoutDigest,
    planDigest: computeFirmwareUpdatePlanDigest(planWithoutDigest),
  };
  const receipt: FirmwareArtifactReceipt = {
    artifactId,
    role: target,
    target,
    artifactRef: `memory-artifact-${digest.slice(0, 24)}`,
    size: binary.byteLength,
    sha256: digest,
    integrity: 'legacy-unverified',
    leaseId: `memory-lease-${digest.slice(0, 24)}`,
    materialization: { kind: 'raw' },
  };
  return {
    preparedPlan: prepareFirmwareUpdate({
      plan,
      artifactReceipts: [receipt],
    }),
    receipt,
  };
};

const createLegacyArtifactIdentity = (target: FirmwareTarget, binary: ArrayBuffer, suffix = '') => {
  const digest = bytesToHex(sha256(new Uint8Array(binary)));
  const identitySuffix = suffix ? `-${suffix}` : '';
  return {
    digest,
    artifactId: `legacy-memory-${target}${identitySuffix}-${digest.slice(0, 16)}`,
    artifactRef: `memory-artifact-${target}${identitySuffix}-${digest.slice(0, 24)}`,
    leaseId: `memory-lease-${target}${identitySuffix}-${digest.slice(0, 24)}`,
  };
};

export const createLegacyV3MemoryPreparedPlan = ({
  device,
  resourceArchive,
  resourceEntries = [],
  bootloaderBinary,
  bootloaderVersion,
  firmwareBinary,
  firmwareVersion,
  bleBinary,
  bleVersion,
}: CreateLegacyV3MemoryPreparedPlanInput): LegacyV3MemoryPreparedPlan => {
  const artifacts: FirmwareArtifactRequirement[] = [];
  const receipts: FirmwareArtifactReceipt[] = [];
  const binariesByArtifactRef = new Map<string, ArrayBuffer>();
  const addRawArtifact = ({
    binary,
    role,
    target,
    targetVersion,
    logicalName,
  }: {
    binary: ArrayBuffer;
    role: FirmwareArtifactRequirement['role'];
    target: FirmwareTarget;
    targetVersion?: string;
    logicalName?: string;
  }) => {
    const identity = createLegacyArtifactIdentity(target, binary, logicalName);
    artifacts.push({
      artifactId: identity.artifactId,
      role,
      sourceUrls: [`https://legacy-memory.invalid/${identity.artifactId}.bin`],
      expectedSize: binary.byteLength,
      expectedSha256: identity.digest,
      integrity: 'legacy-unverified',
      container: { kind: 'raw' },
      target,
      ...(targetVersion ? { targetVersion } : {}),
      devicePathRule: logicalName ? { kind: 'sdk-generated', logicalName } : { kind: 'none' },
      dependsOn: [],
    });
    receipts.push({
      artifactId: identity.artifactId,
      role,
      target,
      ...(logicalName ? { logicalName } : {}),
      artifactRef: identity.artifactRef,
      size: binary.byteLength,
      sha256: identity.digest,
      integrity: 'legacy-unverified',
      leaseId: identity.leaseId,
      materialization: { kind: 'raw' },
    });
    binariesByArtifactRef.set(identity.artifactRef, binary);
    return identity.artifactId;
  };

  let resourceParentArtifactId: string | undefined;
  let resourceParentLeaseId: string | undefined;
  if (resourceArchive) {
    const identity = createLegacyArtifactIdentity('resource', resourceArchive, 'archive');
    resourceParentArtifactId = identity.artifactId;
    resourceParentLeaseId = identity.leaseId;
    artifacts.push({
      artifactId: identity.artifactId,
      role: 'resource-bundle',
      sourceUrls: [`https://legacy-memory.invalid/${identity.artifactId}.zip`],
      expectedSize: resourceArchive.byteLength,
      expectedSha256: identity.digest,
      integrity: 'legacy-unverified',
      container: {
        kind: 'archive',
        format: 'zip',
        materializationPolicy: FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY,
      },
      target: 'resource',
      devicePathRule: { kind: 'none' },
      dependsOn: [],
    });
    receipts.push({
      artifactId: identity.artifactId,
      role: 'resource-bundle',
      target: 'resource',
      artifactRef: identity.artifactRef,
      size: resourceArchive.byteLength,
      sha256: identity.digest,
      integrity: 'legacy-unverified',
      leaseId: identity.leaseId,
      materialization: {
        kind: 'archive',
        materializationPolicy: FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY,
      },
    });
    binariesByArtifactRef.set(identity.artifactRef, resourceArchive);
  }

  resourceEntries.forEach((entry, index) => {
    if (!resourceParentArtifactId || !resourceParentLeaseId) {
      throw new Error('Legacy V3 resource entries require their archive binary');
    }
    const identity = createLegacyArtifactIdentity('resource', entry.binary, String(index));
    const artifactId = createFirmwareArchiveEntryArtifactId({
      parentArtifactId: resourceParentArtifactId,
      entryId: entry.entryId,
      size: entry.binary.byteLength,
      sha256: identity.digest,
    });
    receipts.push({
      artifactId,
      role: 'archive-entry',
      target: 'resource',
      logicalName: entry.logicalName,
      artifactRef: identity.artifactRef,
      size: entry.binary.byteLength,
      sha256: identity.digest,
      integrity: 'legacy-unverified',
      leaseId: resourceParentLeaseId,
      materialization: {
        kind: 'archive-entry',
        parentArtifactId: resourceParentArtifactId,
        entryId: entry.entryId,
      },
    });
    binariesByArtifactRef.set(identity.artifactRef, entry.binary);
  });

  const bootloaderArtifactId = bootloaderBinary
    ? addRawArtifact({
        binary: bootloaderBinary,
        role: 'bootloader',
        target: 'bootloader',
        targetVersion: bootloaderVersion,
      })
    : undefined;
  const componentArtifactIds: string[] = [];
  if (firmwareBinary) {
    componentArtifactIds.push(
      addRawArtifact({
        binary: firmwareBinary,
        role: 'firmware',
        target: 'firmware',
        targetVersion: firmwareVersion,
      })
    );
  }
  if (bleBinary) {
    componentArtifactIds.push(
      addRawArtifact({
        binary: bleBinary,
        role: 'ble',
        target: 'ble',
        targetVersion: bleVersion,
      })
    );
  }

  const epochs: FirmwareUpdateEpoch[] = [];
  let previousEpochId: string | undefined;
  const appendEpoch = (
    epochId: string,
    kind: FirmwareUpdateEpoch['kind'],
    artifactIds: readonly string[],
    targetIds: readonly FirmwareTarget[]
  ) => {
    epochs.push({
      epochId,
      kind,
      artifactIds,
      dependsOn: previousEpochId ? [previousEpochId] : [],
      targetIds,
    });
    previousEpochId = epochId;
  };
  if (resourceParentArtifactId && resourceEntries.length > 0) {
    appendEpoch('resource-sync', 'resource-sync', [resourceParentArtifactId], ['resource']);
  }
  if (bootloaderArtifactId) {
    appendEpoch('bootloader-install', 'bootloader-install', [bootloaderArtifactId], ['bootloader']);
    appendEpoch('bootloader-verify', 'bootloader-verify', [], ['bootloader']);
  }
  if (componentArtifactIds.length > 0) {
    appendEpoch('component-install', 'component-install', componentArtifactIds, [
      ...(firmwareBinary ? (['firmware'] as const) : []),
      ...(bleBinary ? (['ble'] as const) : []),
    ]);
  }
  appendEpoch(
    'final-verify',
    'final-verify',
    [],
    [
      ...(resourceParentArtifactId && resourceEntries.length > 0 ? (['resource'] as const) : []),
      ...(bootloaderArtifactId ? (['bootloader'] as const) : []),
      ...(firmwareBinary ? (['firmware'] as const) : []),
      ...(bleBinary ? (['ble'] as const) : []),
    ]
  );

  const expectedFinalStates = [
    ...(bootloaderVersion ? [{ target: 'bootloader' as const, version: bootloaderVersion }] : []),
    ...(firmwareVersion ? [{ target: 'firmware' as const, version: firmwareVersion }] : []),
    ...(bleVersion ? [{ target: 'ble' as const, version: bleVersion }] : []),
  ];
  const manifestSnapshotDigest = sha256CanonicalFirmwareJson({
    kind: 'legacy-v3-memory',
    artifacts: artifacts.map(artifact => ({
      artifactId: artifact.artifactId,
      digest: artifact.expectedSha256 ?? null,
      size: artifact.expectedSize ?? null,
    })),
  });
  const planWithoutDigest = {
    schemaVersion: FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION,
    planId: `legacy-v3-memory-plan-${manifestSnapshotDigest.slice(0, 16)}`,
    manifestSnapshotDigest,
    manifestMode: 'sdk-managed' as const,
    catalogEpoch: 0,
    device: { ...device },
    artifacts,
    epochs,
    expectedFinalStates,
  };
  const plan: FirmwareUpdatePlan = {
    ...planWithoutDigest,
    planDigest: computeFirmwareUpdatePlanDigest(planWithoutDigest),
  };
  return {
    preparedPlan: prepareFirmwareUpdate({
      plan,
      artifactReceipts: receipts,
    }),
    binariesByArtifactRef,
  };
};
