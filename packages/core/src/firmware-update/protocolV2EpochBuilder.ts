import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import { FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION } from './capabilities';
import { sha256CanonicalFirmwareJson } from './canonical';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';
import { computeFirmwareUpdatePlanDigest } from './planDigest';
import { prepareFirmwareUpdate } from './preparedPlanValidator';
import {
  PROTOCOL_V2_INSTALLABLE_FIRMWARE_TARGETS,
  getProtocolV2FirmwareTargetDescriptor,
  normalizeProtocolV2ResourceBundleName,
} from '../protocols/protocol-v2/firmware';

import type {
  FirmwareArtifactReceipt,
  FirmwareArtifactRequirement,
  FirmwareExpectedTargetState,
  FirmwareTarget,
  FirmwareUpdateEpoch,
  FirmwareUpdatePlan,
  PreparedPlan,
} from './contracts';

export const PROTOCOL_V2_PAYLOAD_PACKAGE_HEADER_SIZE = 0x52a0;
const PROTOCOL_V2_PAYLOAD_HASH_OFFSET = 0x200;
const PROTOCOL_V2_HEADER_HASH_OFFSET = 0x240;
const PROTOCOL_V2_PACKAGE_HASH_SIZE = 64;

export interface ProtocolV2PayloadPackageHeader {
  type: string;
  version: string;
  packedVersion: number;
  payloadHash: string;
  headerHash: string;
}

export interface ProtocolV2PreparedArtifactInput {
  target: Exclude<FirmwareTarget, 'firmware' | 'ble'>;
  binary: ArrayBuffer;
  logicalName?: string;
  targetVersion?: string;
}

export interface CreateProtocolV2MemoryPreparedPlanInput {
  device: {
    identity: string;
    model: string;
    firmwareType?: string;
  };
  artifacts: readonly ProtocolV2PreparedArtifactInput[];
}

export interface ProtocolV2MemoryPreparedPlan {
  preparedPlan: PreparedPlan;
  binariesByArtifactRef: ReadonlyMap<string, ArrayBuffer>;
}

const protocolV2PlanInvalid = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwarePlanInvalid, detail, { detail });
};

const readAscii = (bytes: Uint8Array, offset: number, length: number): string =>
  Array.from(bytes.slice(offset, offset + length))
    .map(byte => String.fromCharCode(byte))
    .join('');

const packedVersionToString = (packedVersion: number): string =>
  `${Math.floor(packedVersion / 0x10000) % 0x100}.${Math.floor(packedVersion / 0x100) % 0x100}.${
    packedVersion % 0x100
  }`;

export const parseProtocolV2PayloadPackageHeader = (
  bytes: Uint8Array
): ProtocolV2PayloadPackageHeader | null => {
  if (bytes.byteLength < PROTOCOL_V2_PAYLOAD_PACKAGE_HEADER_SIZE) {
    return null;
  }
  if (readAscii(bytes, 0, 4) !== 'OKPP') {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0x0c, true) !== PROTOCOL_V2_PAYLOAD_PACKAGE_HEADER_SIZE) {
    return null;
  }
  const packedVersion = view.getUint32(0x10, true);
  return {
    type: readAscii(bytes, 0x08, 4),
    version: packedVersionToString(packedVersion),
    packedVersion,
    payloadHash: bytesToHex(
      bytes.slice(
        PROTOCOL_V2_PAYLOAD_HASH_OFFSET,
        PROTOCOL_V2_PAYLOAD_HASH_OFFSET + PROTOCOL_V2_PACKAGE_HASH_SIZE
      )
    ),
    headerHash: bytesToHex(
      bytes.slice(
        PROTOCOL_V2_HEADER_HASH_OFFSET,
        PROTOCOL_V2_HEADER_HASH_OFFSET + PROTOCOL_V2_PACKAGE_HASH_SIZE
      )
    ),
  };
};

const uniqueTargets = (targets: readonly FirmwareTarget[]): FirmwareTarget[] => [
  ...new Set(targets),
];

export const compileProtocolV2FirmwareEpochs = (
  artifacts: readonly Pick<FirmwareArtifactRequirement, 'artifactId' | 'target'>[]
): FirmwareUpdateEpoch[] => {
  const resourceArtifactIds = artifacts
    .filter(artifact => artifact.target === 'resource')
    .map(artifact => artifact.artifactId);
  const bootloaderArtifactIds = artifacts
    .filter(artifact => artifact.target === 'bootloader')
    .map(artifact => artifact.artifactId);
  const componentTargets = PROTOCOL_V2_INSTALLABLE_FIRMWARE_TARGETS.filter(
    descriptor => descriptor.target !== 'bootloader'
  );
  const componentArtifacts = componentTargets.flatMap(descriptor =>
    artifacts.filter(artifact => artifact.target === descriptor.target)
  );

  if (bootloaderArtifactIds.length > 1) {
    protocolV2PlanInvalid('Protocol V2 plans may contain only one bootloader artifact');
  }
  const duplicateComponentTarget = componentTargets.find(
    descriptor =>
      componentArtifacts.filter(artifact => artifact.target === descriptor.target).length > 1
  );
  if (duplicateComponentTarget) {
    protocolV2PlanInvalid(
      `Protocol V2 plans may contain only one ${duplicateComponentTarget.target} artifact`
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
      targetIds: uniqueTargets(targetIds),
    });
    previousEpochId = epochId;
  };

  if (resourceArtifactIds.length > 0) {
    appendEpoch('resource-sync', 'resource-sync', resourceArtifactIds, ['resource']);
  }
  if (bootloaderArtifactIds.length > 0) {
    appendEpoch('bootloader-install', 'bootloader-install', bootloaderArtifactIds, ['bootloader']);
    appendEpoch('bootloader-verify', 'bootloader-verify', [], ['bootloader']);
  }
  if (componentArtifacts.length > 0) {
    appendEpoch(
      'component-install',
      'component-install',
      componentArtifacts.map(artifact => artifact.artifactId),
      componentArtifacts.map(artifact => artifact.target)
    );
  }
  appendEpoch(
    'final-verify',
    'final-verify',
    [],
    uniqueTargets(artifacts.map(artifact => artifact.target))
  );
  return epochs;
};

const createArtifactIdentity = (
  target: FirmwareTarget,
  logicalName: string | undefined,
  binary: ArrayBuffer
) => {
  const digest = bytesToHex(sha256(new Uint8Array(binary)));
  const qualifier = logicalName ? `-${logicalName}` : '';
  return {
    digest,
    artifactId: `protocol-v2-${target}${qualifier}-${digest.slice(0, 16)}`,
    artifactRef: `protocol-v2-artifact-${target}${qualifier}-${digest.slice(0, 20)}`,
    leaseId: `protocol-v2-lease-${target}${qualifier}-${digest.slice(0, 20)}`,
  };
};

export const createProtocolV2MemoryPreparedPlan = ({
  device,
  artifacts: inputs,
}: CreateProtocolV2MemoryPreparedPlanInput): ProtocolV2MemoryPreparedPlan => {
  if (inputs.length === 0) {
    return protocolV2PlanInvalid('Protocol V2 plans require at least one artifact');
  }

  const artifacts: FirmwareArtifactRequirement[] = [];
  const receipts: FirmwareArtifactReceipt[] = [];
  const binariesByArtifactRef = new Map<string, ArrayBuffer>();
  const expectedFinalStates: FirmwareExpectedTargetState[] = [];
  const resourceNames = new Set<string>();
  const installTargets = new Set<FirmwareTarget>();
  const targetOrder = new Map(
    PROTOCOL_V2_INSTALLABLE_FIRMWARE_TARGETS.map((descriptor, index) => [descriptor.target, index])
  );
  const orderedInputs = [...inputs].sort((left, right) => {
    if (left.target === 'resource') return right.target === 'resource' ? 0 : -1;
    if (right.target === 'resource') return 1;
    return (
      (targetOrder.get(left.target) ?? Number.MAX_SAFE_INTEGER) -
      (targetOrder.get(right.target) ?? Number.MAX_SAFE_INTEGER)
    );
  });

  orderedInputs.forEach(input => {
    if (input.binary.byteLength === 0) {
      protocolV2PlanInvalid(`Protocol V2 ${input.target} artifact is empty`);
    }
    const isResource = input.target === 'resource';
    const logicalName = isResource
      ? normalizeProtocolV2ResourceBundleName(input.logicalName ?? '')
      : undefined;
    if (logicalName && resourceNames.has(logicalName)) {
      protocolV2PlanInvalid(`Duplicate Protocol V2 resource bundle: ${logicalName}`);
    }
    if (logicalName) {
      resourceNames.add(logicalName);
    }
    if (!isResource) {
      getProtocolV2FirmwareTargetDescriptor(input.target);
      if (installTargets.has(input.target)) {
        protocolV2PlanInvalid(`Duplicate Protocol V2 firmware target: ${input.target}`);
      }
      installTargets.add(input.target);
    }

    const header = parseProtocolV2PayloadPackageHeader(new Uint8Array(input.binary));
    if (input.targetVersion && header && input.targetVersion !== header.version) {
      protocolV2PlanInvalid(
        `Protocol V2 ${input.target} version ${header.version} does not match ${input.targetVersion}`
      );
    }
    const targetVersion = input.targetVersion ?? header?.version;
    if (!isResource && !targetVersion) {
      protocolV2PlanInvalid(
        `Protocol V2 ${input.target} artifact has no verifiable payload version`
      );
    }

    const identity = createArtifactIdentity(input.target, logicalName, input.binary);
    let role: FirmwareArtifactRequirement['role'] = 'component';
    if (isResource) {
      role = 'resource-bundle';
    } else if (input.target === 'bootloader') {
      role = 'bootloader';
    }
    const bootloaderArtifactId = artifacts.find(
      artifact => artifact.target === 'bootloader'
    )?.artifactId;
    artifacts.push({
      artifactId: identity.artifactId,
      role,
      sourceUrls: [`https://protocol-v2-memory.invalid/${identity.artifactId}.bin`],
      expectedSize: input.binary.byteLength,
      expectedSha256: identity.digest,
      integrity: 'legacy-unverified',
      container: { kind: 'raw' },
      target: input.target,
      ...(targetVersion ? { targetVersion } : {}),
      devicePathRule: logicalName ? { kind: 'sdk-generated', logicalName } : { kind: 'none' },
      dependsOn:
        !isResource && input.target !== 'bootloader' && bootloaderArtifactId
          ? [bootloaderArtifactId]
          : [],
    });
    receipts.push({
      artifactId: identity.artifactId,
      role,
      target: input.target,
      ...(logicalName ? { logicalName } : {}),
      artifactRef: identity.artifactRef,
      size: input.binary.byteLength,
      sha256: identity.digest,
      integrity: 'legacy-unverified',
      leaseId: identity.leaseId,
      materialization: { kind: 'raw' },
    });
    binariesByArtifactRef.set(identity.artifactRef, input.binary);

    if (!isResource && targetVersion) {
      expectedFinalStates.push({
        target: input.target,
        version: targetVersion,
      });
    }
  });

  if (resourceNames.size > 0) {
    expectedFinalStates.push({
      target: 'resource',
      sha256: sha256CanonicalFirmwareJson(
        receipts
          .filter(receipt => receipt.target === 'resource')
          .map(receipt => ({ artifactId: receipt.artifactId, sha256: receipt.sha256 }))
      ),
    });
  }

  const epochs = compileProtocolV2FirmwareEpochs(artifacts);
  const manifestSnapshotDigest = sha256CanonicalFirmwareJson({
    kind: 'protocol-v2-memory',
    artifacts: artifacts.map(artifact => ({
      artifactId: artifact.artifactId,
      target: artifact.target,
      digest: artifact.expectedSha256,
      size: artifact.expectedSize,
      version: artifact.targetVersion ?? null,
    })),
  });
  const planWithoutDigest = {
    schemaVersion: FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION,
    planId: `protocol-v2-memory-plan-${manifestSnapshotDigest.slice(0, 16)}`,
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
    preparedPlan: prepareFirmwareUpdate({ plan, artifactReceipts: receipts }),
    binariesByArtifactRef,
  };
};
