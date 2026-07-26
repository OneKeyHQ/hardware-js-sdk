import {
  FIRMWARE_CHECKPOINT_SCHEMA_VERSION,
  FIRMWARE_PREPARED_PLAN_SCHEMA_VERSION,
  FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION,
  type FirmwareManifestModeKind,
} from './capabilities';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';

export type FirmwareJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly FirmwareJsonValue[]
  | { readonly [key: string]: FirmwareJsonValue };

export type FirmwareArtifactIntegrity = 'catalog-trusted' | 'signed-manifest' | 'legacy-unverified';

export type FirmwareArtifactRole =
  | 'firmware'
  | 'ble'
  | 'bootloader'
  | 'resource'
  | 'resource-bundle'
  | 'component'
  | 'archive-entry';

export const FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY = 'v3-resource-files-v1' as const;

export type FirmwareArchiveMaterializationPolicy = typeof FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY;

export type FirmwareTarget =
  | 'firmware'
  | 'ble'
  | 'bootloader'
  | 'resource'
  | 'p1'
  | 'p2'
  | 'coprocessor'
  | 'se01'
  | 'se02'
  | 'se03'
  | 'se04';

export type FirmwareArtifactContainer =
  | {
      kind: 'raw';
    }
  | {
      kind: 'archive';
      format: 'zip';
      materializationPolicy: FirmwareArchiveMaterializationPolicy;
    };

export type FirmwareDevicePathRule =
  | {
      kind: 'none';
    }
  | {
      kind: 'sdk-generated';
      logicalName: string;
    };

export interface FirmwareArtifactRequirement {
  artifactId: string;
  role: FirmwareArtifactRole;
  sourceUrls: readonly string[];
  expectedSize?: number;
  expectedSha256?: string;
  integrity: FirmwareArtifactIntegrity;
  container: FirmwareArtifactContainer;
  target: FirmwareTarget;
  targetVersion?: string;
  devicePathRule: FirmwareDevicePathRule;
  dependsOn: readonly string[];
}

export type FirmwareReleaseChannel = 'stable' | 'pre-release';

export interface FirmwareManifestRelease {
  releaseId: string;
  deviceModel: string;
  firmwareType: string;
  channel: FirmwareReleaseChannel;
  version: string;
  required: boolean;
  artifactIds: readonly string[];
}

export interface FirmwareManifestSnapshot {
  schemaVersion: typeof FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION;
  snapshotDigest: string;
  catalogEpoch: number;
  source:
    | 'app-bundled-catalog'
    | 'signed-remote-config'
    | 'sdk-managed-remote'
    | 'sdk-managed-bundled';
  sourceProjectionDigest: string;
  artifactCatalog: readonly FirmwareArtifactRequirement[];
  releases: readonly FirmwareManifestRelease[];
}

export interface FirmwareDeviceIdentity {
  identity: string;
  model: string;
  firmwareType?: string;
}

export interface FirmwareDeviceSnapshot extends FirmwareDeviceIdentity {
  firmwareType: string;
  currentVersions: Readonly<Partial<Record<FirmwareTarget, string>>>;
}

export type FirmwareUpdateEpochKind =
  | 'resource-sync'
  | 'bootloader-install'
  | 'bootloader-verify'
  | 'component-install'
  | 'final-verify';

export interface FirmwareUpdateEpoch {
  epochId: string;
  kind: FirmwareUpdateEpochKind;
  artifactIds: readonly string[];
  dependsOn: readonly string[];
  targetIds: readonly FirmwareTarget[];
}

export interface FirmwareExpectedTargetState {
  target: FirmwareTarget;
  version?: string;
  sha256?: string;
}

export interface FirmwareUpdatePlan {
  schemaVersion: typeof FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION;
  planId: string;
  planDigest: string;
  manifestSnapshotDigest: string;
  manifestMode: FirmwareManifestModeKind;
  catalogEpoch: number;
  device: FirmwareDeviceIdentity;
  artifacts: readonly FirmwareArtifactRequirement[];
  epochs: readonly FirmwareUpdateEpoch[];
  expectedFinalStates: readonly FirmwareExpectedTargetState[];
}

export type FirmwareArtifactMaterialization =
  | {
      kind: 'raw';
    }
  | {
      kind: 'archive';
      materializationPolicy: FirmwareArchiveMaterializationPolicy;
    }
  | {
      kind: 'archive-entry';
      parentArtifactId: string;
      entryId: string;
    };

export interface FirmwareArtifactReceipt {
  artifactId: string;
  role: FirmwareArtifactRole;
  target: FirmwareTarget;
  logicalName?: string;
  artifactRef: string;
  size: number;
  sha256: string;
  integrity: FirmwareArtifactIntegrity;
  leaseId: string;
  materialization: FirmwareArtifactMaterialization;
}

export interface PreparedPlan {
  schemaVersion: typeof FIRMWARE_PREPARED_PLAN_SCHEMA_VERSION;
  planId: string;
  planDigest: string;
  manifestSnapshotDigest: string;
  catalogEpoch: number;
  networkPolicy: 'forbid';
  device: FirmwareDeviceIdentity;
  artifactReceipts: readonly FirmwareArtifactReceipt[];
  epochs: readonly FirmwareUpdateEpoch[];
  expectedFinalStates: readonly FirmwareExpectedTargetState[];
}

export type FirmwareArtifactRef = string;
export type FirmwareArtifactReaderId = string;
export type FirmwareArtifactOperationId = string;

export interface FirmwareArtifactReaderOpenInput {
  artifactRef: FirmwareArtifactRef;
}

export interface FirmwareArtifactReaderOpenResult {
  readerId: FirmwareArtifactReaderId;
  size: number;
}

export interface FirmwareArtifactReaderReadInput {
  readerId: FirmwareArtifactReaderId;
  operationId: FirmwareArtifactOperationId;
  offset: number;
  length: number;
}

export interface FirmwareArtifactReaderReadResult {
  data: ArrayBuffer;
  bytesRead: number;
  eof: boolean;
}

export interface FirmwareArtifactReaderCloseInput {
  readerId: FirmwareArtifactReaderId;
}

export interface FirmwareArtifactReaderCancelInput {
  operationId: FirmwareArtifactOperationId;
}

export interface FirmwareArtifactReader {
  open: (input: FirmwareArtifactReaderOpenInput) => Promise<FirmwareArtifactReaderOpenResult>;
  read: (input: FirmwareArtifactReaderReadInput) => Promise<FirmwareArtifactReaderReadResult>;
  close: (input: FirmwareArtifactReaderCloseInput) => Promise<void>;
  cancel: (input: FirmwareArtifactReaderCancelInput) => Promise<void>;
}

export type FirmwareTransactionState =
  | 'DEVICE_SNAPSHOT'
  | 'PLAN_CREATED'
  | 'ACQUIRING_ARTIFACTS'
  | 'MATERIALIZING_ARTIFACTS'
  | 'VERIFYING_LOCAL_ARTIFACTS'
  | 'PREPARED'
  | 'REVALIDATING_DEVICE'
  | 'ENTERING_LOADER'
  | 'SYNCING_OR_TRANSFERRING'
  | 'STAGED'
  | 'AWAITING_CONFIRMATION'
  | 'INSTALL_REQUESTED'
  | 'INSTALLING'
  | 'REBOOTING_BETWEEN_EPOCHS'
  | 'FINAL_VERIFYING'
  | 'COMPLETED'
  | 'PAUSED'
  | 'ABANDONED'
  | 'FAILED';

export interface FirmwareCheckpoint {
  schemaVersion: typeof FIRMWARE_CHECKPOINT_SCHEMA_VERSION;
  transactionId: string;
  planDigest: string;
  sequence: number;
  state: FirmwareTransactionState;
  timestampMs: number;
  generation?: number;
  deviceIdentity?: string;
  epochId?: string;
  artifactId?: string;
  artifactOffset?: number;
  target?: FirmwareTarget;
  completedArtifactIds?: readonly string[];
  completedEpochIds?: readonly string[];
  destructiveActionStarted?: boolean;
  terminal?: boolean;
  installRequestStatus?: 'not-requested' | 'request-pending' | 'acknowledged';
  deviceState?: FirmwareJsonValue;
}

export interface FirmwareCheckpointSink {
  commit: (checkpoint: FirmwareCheckpoint) => Promise<void>;
}

export interface FirmwareProgressEvent {
  transactionId: string;
  phase: FirmwareTransactionState;
  completed: number;
  total: number;
  artifactId?: string;
  target?: FirmwareTarget;
}

export interface FirmwareProgressSink {
  report: (event: FirmwareProgressEvent) => void | Promise<void>;
}

export interface FirmwareUpdateHostBinding {
  artifactReader: FirmwareArtifactReader;
  checkpointSink: FirmwareCheckpointSink;
  progressSink?: FirmwareProgressSink;
}

const ARTIFACT_INTEGRITIES = new Set<FirmwareArtifactIntegrity>([
  'catalog-trusted',
  'signed-manifest',
  'legacy-unverified',
]);
const ARTIFACT_ROLES = new Set<FirmwareArtifactRole>([
  'firmware',
  'ble',
  'bootloader',
  'resource',
  'resource-bundle',
  'component',
  'archive-entry',
]);
const RELEASE_CHANNELS = new Set<FirmwareReleaseChannel>(['stable', 'pre-release']);
const FIRMWARE_TARGETS = new Set<FirmwareTarget>([
  'firmware',
  'ble',
  'bootloader',
  'resource',
  'p1',
  'p2',
  'coprocessor',
  'se01',
  'se02',
  'se03',
  'se04',
]);
const EPOCH_KINDS = new Set<FirmwareUpdateEpochKind>([
  'resource-sync',
  'bootloader-install',
  'bootloader-verify',
  'component-install',
  'final-verify',
]);
const TRANSACTION_STATES = new Set<FirmwareTransactionState>([
  'DEVICE_SNAPSHOT',
  'PLAN_CREATED',
  'ACQUIRING_ARTIFACTS',
  'MATERIALIZING_ARTIFACTS',
  'VERIFYING_LOCAL_ARTIFACTS',
  'PREPARED',
  'REVALIDATING_DEVICE',
  'ENTERING_LOADER',
  'SYNCING_OR_TRANSFERRING',
  'STAGED',
  'AWAITING_CONFIRMATION',
  'INSTALL_REQUESTED',
  'INSTALLING',
  'REBOOTING_BETWEEN_EPOCHS',
  'FINAL_VERIFYING',
  'COMPLETED',
  'PAUSED',
  'ABANDONED',
  'FAILED',
]);
const SNAPSHOT_SOURCES = new Set<FirmwareManifestSnapshot['source']>([
  'app-bundled-catalog',
  'signed-remote-config',
  'sdk-managed-remote',
  'sdk-managed-bundled',
]);
const MAX_FIRMWARE_ARTIFACT_ID_BYTES = 256;
const MAX_FIRMWARE_ARTIFACT_BYTES = 512 * 1024 * 1024;
const UTF8_ENCODER = new TextEncoder();
const FORBIDDEN_PREPARED_KEYS = new Set([
  'url',
  'urls',
  'sourceurl',
  'sourceurls',
  'path',
  'filepath',
  'absolutepath',
  'readerid',
  'messageport',
  'filedescriptor',
  'binary',
  'arraybuffer',
]);

const invalidContract = (detail: string): never => {
  throw createFirmwareUpdateError(
    FirmwareUpdateErrorCode.FirmwarePlanInvalid,
    `Firmware update contract is invalid: ${detail}`,
    { detail }
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const assertRecord = (value: unknown, context: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    return invalidContract(`${context} must be an object`);
  }
  return value;
};

const assertExactKeys = (
  record: Record<string, unknown>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  context: string
) => {
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  const unknownKey = Object.keys(record).find(key => !allowedKeys.has(key));
  if (unknownKey) {
    invalidContract(`${context}.${unknownKey} is not allowed`);
  }
  const missingKey = requiredKeys.find(key => !Object.prototype.hasOwnProperty.call(record, key));
  if (missingKey) {
    invalidContract(`${context}.${missingKey} is required`);
  }
};

const assertNonEmptyString = (value: unknown, context: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    return invalidContract(`${context} must be a non-empty string`);
  }
  return value;
};

const assertArtifactId = (value: unknown, context: string): string => {
  const artifactId = assertNonEmptyString(value, context);
  if (UTF8_ENCODER.encode(artifactId).byteLength > MAX_FIRMWARE_ARTIFACT_ID_BYTES) {
    return invalidContract(
      `${context} must not exceed ${MAX_FIRMWARE_ARTIFACT_ID_BYTES} UTF-8 bytes`
    );
  }
  return artifactId;
};

const assertOpaqueArtifactRef = (value: unknown, context: string): string => {
  const artifactRef = assertNonEmptyString(value, context);
  if (
    artifactRef.includes('\0') ||
    /^(?:[a-z][a-z0-9+.-]*:|[\\/]|~[\\/]|\.{1,2}[\\/]|[a-z]:[\\/])/i.test(artifactRef)
  ) {
    return invalidContract(`${context} must be opaque and must not expose a URL or path`);
  }
  return artifactRef;
};

const assertSha256 = (value: unknown, context: string): string => {
  const digest = assertNonEmptyString(value, context);
  if (!/^[0-9a-f]{64}$/i.test(digest)) {
    return invalidContract(`${context} must be a full SHA-256 digest`);
  }
  return digest.toLowerCase();
};

const assertSafeInteger = (value: unknown, context: string, minimum = 0): number => {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    return invalidContract(`${context} must be a safe integer >= ${minimum}`);
  }
  return value as number;
};

const assertArray = (value: unknown, context: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    return invalidContract(`${context} must be an array`);
  }
  return value;
};

const assertUniqueStrings = (value: unknown, context: string): readonly string[] => {
  const strings = assertArray(value, context).map((item, index) =>
    assertNonEmptyString(item, `${context}[${index}]`)
  );
  if (new Set(strings).size !== strings.length) {
    invalidContract(`${context} must not contain duplicate values`);
  }
  return strings;
};

const assertJsonValue = (value: unknown, context: string): FirmwareJsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return invalidContract(`${context} must contain only finite numbers`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonValue(item, `${context}[${index}]`));
    return value as readonly FirmwareJsonValue[];
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, item]) => assertJsonValue(item, `${context}.${key}`));
    return value as { readonly [key: string]: FirmwareJsonValue };
  }
  return invalidContract(`${context} must be JSON-serializable`);
};

const validateDeviceIdentity = (value: unknown, context: string): FirmwareDeviceIdentity => {
  const device = assertRecord(value, context);
  assertExactKeys(device, ['identity', 'model'], ['firmwareType'], context);
  assertNonEmptyString(device.identity, `${context}.identity`);
  assertNonEmptyString(device.model, `${context}.model`);
  if (device.firmwareType !== undefined) {
    assertNonEmptyString(device.firmwareType, `${context}.firmwareType`);
  }
  return value as FirmwareDeviceIdentity;
};

const validateArtifactContainer = (value: unknown, context: string): FirmwareArtifactContainer => {
  const container = assertRecord(value, context);
  const kind = assertNonEmptyString(container.kind, `${context}.kind`);
  if (kind === 'raw') {
    assertExactKeys(container, ['kind'], [], context);
  } else if (kind === 'archive') {
    assertExactKeys(container, ['kind', 'format', 'materializationPolicy'], [], context);
    if (container.format !== 'zip') {
      invalidContract(`${context}.format must be zip`);
    }
    if (container.materializationPolicy !== FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY) {
      invalidContract(
        `${context}.materializationPolicy must be ${FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY}`
      );
    }
  } else {
    invalidContract(`${context}.kind is unsupported`);
  }
  return value as FirmwareArtifactContainer;
};

const validateDevicePathRule = (value: unknown, context: string): FirmwareDevicePathRule => {
  const rule = assertRecord(value, context);
  const kind = assertNonEmptyString(rule.kind, `${context}.kind`);
  if (kind === 'none') {
    assertExactKeys(rule, ['kind'], [], context);
  } else if (kind === 'sdk-generated') {
    assertExactKeys(rule, ['kind', 'logicalName'], [], context);
    assertNonEmptyString(rule.logicalName, `${context}.logicalName`);
  } else {
    invalidContract(`${context}.kind is unsupported`);
  }
  return value as FirmwareDevicePathRule;
};

const validateArtifactRequirement = (
  value: unknown,
  context: string
): FirmwareArtifactRequirement => {
  const artifact = assertRecord(value, context);
  assertExactKeys(
    artifact,
    [
      'artifactId',
      'role',
      'sourceUrls',
      'integrity',
      'container',
      'target',
      'devicePathRule',
      'dependsOn',
    ],
    ['expectedSize', 'expectedSha256', 'targetVersion'],
    context
  );
  assertArtifactId(artifact.artifactId, `${context}.artifactId`);
  if (!ARTIFACT_ROLES.has(artifact.role as FirmwareArtifactRole)) {
    invalidContract(`${context}.role is unsupported`);
  }
  const sourceUrls = assertUniqueStrings(artifact.sourceUrls, `${context}.sourceUrls`);
  if (sourceUrls.length === 0) {
    invalidContract(`${context}.sourceUrls must not be empty`);
  }
  sourceUrls.forEach((sourceUrl, index) => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return invalidContract(`${context}.sourceUrls[${index}] must be a valid URL`);
    }
    if (
      parsedUrl.protocol !== 'https:' ||
      parsedUrl.username.length > 0 ||
      parsedUrl.password.length > 0 ||
      (parsedUrl.port !== '' && parsedUrl.port !== '443')
    ) {
      invalidContract(`${context}.sourceUrls[${index}] must be credential-free HTTPS`);
    }
  });
  if (artifact.expectedSize !== undefined) {
    const expectedSize = assertSafeInteger(artifact.expectedSize, `${context}.expectedSize`, 1);
    if (expectedSize > MAX_FIRMWARE_ARTIFACT_BYTES) {
      invalidContract(`${context}.expectedSize must not exceed ${MAX_FIRMWARE_ARTIFACT_BYTES}`);
    }
  }
  if (artifact.expectedSha256 !== undefined) {
    assertSha256(artifact.expectedSha256, `${context}.expectedSha256`);
  }
  if (!ARTIFACT_INTEGRITIES.has(artifact.integrity as FirmwareArtifactIntegrity)) {
    invalidContract(`${context}.integrity is unsupported`);
  }
  const container = validateArtifactContainer(artifact.container, `${context}.container`);
  if (!FIRMWARE_TARGETS.has(artifact.target as FirmwareTarget)) {
    invalidContract(`${context}.target is unsupported`);
  }
  if (artifact.targetVersion !== undefined) {
    assertNonEmptyString(artifact.targetVersion, `${context}.targetVersion`);
  }
  const devicePathRule = validateDevicePathRule(
    artifact.devicePathRule,
    `${context}.devicePathRule`
  );
  assertUniqueStrings(artifact.dependsOn, `${context}.dependsOn`);
  if (artifact.role === 'archive-entry') {
    invalidContract(`${context}.role archive-entry is reserved for materialized receipts`);
  }
  if (
    container.kind === 'archive' &&
    (artifact.role !== 'resource-bundle' ||
      artifact.target !== 'resource' ||
      devicePathRule.kind !== 'none')
  ) {
    invalidContract(`${context} archive must be a resource-bundle with an SDK-owned path policy`);
  }
  return value as FirmwareArtifactRequirement;
};

const validateManifestRelease = (value: unknown, context: string): FirmwareManifestRelease => {
  const release = assertRecord(value, context);
  assertExactKeys(
    release,
    ['releaseId', 'deviceModel', 'firmwareType', 'channel', 'version', 'required', 'artifactIds'],
    [],
    context
  );
  assertNonEmptyString(release.releaseId, `${context}.releaseId`);
  assertNonEmptyString(release.deviceModel, `${context}.deviceModel`);
  assertNonEmptyString(release.firmwareType, `${context}.firmwareType`);
  if (!RELEASE_CHANNELS.has(release.channel as FirmwareReleaseChannel)) {
    invalidContract(`${context}.channel is unsupported`);
  }
  assertNonEmptyString(release.version, `${context}.version`);
  if (typeof release.required !== 'boolean') {
    invalidContract(`${context}.required must be a boolean`);
  }
  const artifactIds = assertUniqueStrings(release.artifactIds, `${context}.artifactIds`);
  if (artifactIds.length === 0) {
    invalidContract(`${context}.artifactIds must not be empty`);
  }
  return value as FirmwareManifestRelease;
};

const validateEpoch = (value: unknown, context: string): FirmwareUpdateEpoch => {
  const epoch = assertRecord(value, context);
  assertExactKeys(epoch, ['epochId', 'kind', 'artifactIds', 'dependsOn', 'targetIds'], [], context);
  assertNonEmptyString(epoch.epochId, `${context}.epochId`);
  if (!EPOCH_KINDS.has(epoch.kind as FirmwareUpdateEpochKind)) {
    invalidContract(`${context}.kind is unsupported`);
  }
  assertUniqueStrings(epoch.artifactIds, `${context}.artifactIds`);
  assertUniqueStrings(epoch.dependsOn, `${context}.dependsOn`);
  const targetIds = assertUniqueStrings(epoch.targetIds, `${context}.targetIds`);
  targetIds.forEach((target, index) => {
    if (!FIRMWARE_TARGETS.has(target as FirmwareTarget)) {
      invalidContract(`${context}.targetIds[${index}] is unsupported`);
    }
  });
  return value as FirmwareUpdateEpoch;
};

const validateExpectedFinalState = (
  value: unknown,
  context: string
): FirmwareExpectedTargetState => {
  const expectedState = assertRecord(value, context);
  assertExactKeys(expectedState, ['target'], ['version', 'sha256'], context);
  if (!FIRMWARE_TARGETS.has(expectedState.target as FirmwareTarget)) {
    invalidContract(`${context}.target is unsupported`);
  }
  if (expectedState.version !== undefined) {
    assertNonEmptyString(expectedState.version, `${context}.version`);
  }
  if (expectedState.sha256 !== undefined) {
    assertSha256(expectedState.sha256, `${context}.sha256`);
  }
  if (expectedState.version === undefined && expectedState.sha256 === undefined) {
    invalidContract(`${context} must contain version or sha256`);
  }
  return value as FirmwareExpectedTargetState;
};

const validateEpochsAndFinalStates = (epochsValue: unknown, finalStatesValue: unknown) => {
  const epochs = assertArray(epochsValue, 'plan.epochs').map((item, index) =>
    validateEpoch(item, `plan.epochs[${index}]`)
  );
  const epochIds = epochs.map(item => item.epochId);
  if (new Set(epochIds).size !== epochIds.length) {
    invalidContract('plan.epochs must not contain duplicate epochId values');
  }

  const expectedFinalStates = assertArray(finalStatesValue, 'plan.expectedFinalStates').map(
    (item, index) => validateExpectedFinalState(item, `plan.expectedFinalStates[${index}]`)
  );
  const targets = expectedFinalStates.map(item => item.target);
  if (new Set(targets).size !== targets.length) {
    invalidContract('plan.expectedFinalStates must not contain duplicate targets');
  }
};

const rejectPreparedPlanLeaks = (value: unknown, context: string, seen: Set<object>) => {
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    invalidContract(`${context} must not contain binary data`);
  }
  if (typeof value !== 'object' || value === null) {
    return;
  }
  if (seen.has(value)) {
    invalidContract(`${context} must not contain cycles`);
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectPreparedPlanLeaks(item, `${context}[${index}]`, seen));
  } else {
    Object.entries(value).forEach(([key, item]) => {
      const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (FORBIDDEN_PREPARED_KEYS.has(normalizedKey)) {
        invalidContract(`${context}.${key} is forbidden after preparation`);
      }
      rejectPreparedPlanLeaks(item, `${context}.${key}`, seen);
    });
  }
  seen.delete(value);
};

const validateArtifactMaterialization = (
  value: unknown,
  context: string
): FirmwareArtifactMaterialization => {
  const materialization = assertRecord(value, context);
  const kind = assertNonEmptyString(materialization.kind, `${context}.kind`);
  if (kind === 'raw') {
    assertExactKeys(materialization, ['kind'], [], context);
  } else if (kind === 'archive') {
    assertExactKeys(materialization, ['kind', 'materializationPolicy'], [], context);
    if (materialization.materializationPolicy !== FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY) {
      invalidContract(
        `${context}.materializationPolicy must be ${FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY}`
      );
    }
  } else if (kind === 'archive-entry') {
    assertExactKeys(materialization, ['kind', 'parentArtifactId', 'entryId'], [], context);
    assertArtifactId(materialization.parentArtifactId, `${context}.parentArtifactId`);
    assertNonEmptyString(materialization.entryId, `${context}.entryId`);
  } else {
    invalidContract(`${context}.kind is unsupported`);
  }
  return value as FirmwareArtifactMaterialization;
};

const validateArtifactReceipt = (value: unknown, context: string): FirmwareArtifactReceipt => {
  const receipt = assertRecord(value, context);
  assertExactKeys(
    receipt,
    [
      'artifactId',
      'role',
      'target',
      'artifactRef',
      'size',
      'sha256',
      'integrity',
      'leaseId',
      'materialization',
    ],
    ['logicalName'],
    context
  );
  assertArtifactId(receipt.artifactId, `${context}.artifactId`);
  if (!ARTIFACT_ROLES.has(receipt.role as FirmwareArtifactRole)) {
    invalidContract(`${context}.role is unsupported`);
  }
  if (!FIRMWARE_TARGETS.has(receipt.target as FirmwareTarget)) {
    invalidContract(`${context}.target is unsupported`);
  }
  if (receipt.logicalName !== undefined) {
    assertNonEmptyString(receipt.logicalName, `${context}.logicalName`);
  }
  assertOpaqueArtifactRef(receipt.artifactRef, `${context}.artifactRef`);
  const receiptSize = assertSafeInteger(receipt.size, `${context}.size`, 1);
  if (receiptSize > MAX_FIRMWARE_ARTIFACT_BYTES) {
    invalidContract(`${context}.size must not exceed ${MAX_FIRMWARE_ARTIFACT_BYTES}`);
  }
  assertSha256(receipt.sha256, `${context}.sha256`);
  if (!ARTIFACT_INTEGRITIES.has(receipt.integrity as FirmwareArtifactIntegrity)) {
    invalidContract(`${context}.integrity is unsupported`);
  }
  assertNonEmptyString(receipt.leaseId, `${context}.leaseId`);
  validateArtifactMaterialization(receipt.materialization, `${context}.materialization`);
  return value as FirmwareArtifactReceipt;
};

const validateArtifactReceiptRefs = (receipts: readonly FirmwareArtifactReceipt[]) => {
  const receiptsByArtifactRef = new Map<string, FirmwareArtifactReceipt[]>();
  const receiptsByArtifactId = new Map(receipts.map(receipt => [receipt.artifactId, receipt]));
  receipts.forEach(receipt => {
    const matchingReceipts = receiptsByArtifactRef.get(receipt.artifactRef) ?? [];
    matchingReceipts.push(receipt);
    receiptsByArtifactRef.set(receipt.artifactRef, matchingReceipts);
  });

  receiptsByArtifactRef.forEach(matchingReceipts => {
    if (matchingReceipts.length < 2) {
      return;
    }
    const [firstReceipt] = matchingReceipts;
    if (!firstReceipt) {
      return;
    }
    const firstMaterialization = firstReceipt.materialization;
    if (firstMaterialization.kind !== 'archive-entry') {
      return invalidContract(
        `preparedPlan.artifactReceipts must not reuse artifactRef ${firstReceipt.artifactRef}`
      );
    }
    const { parentArtifactId } = firstMaterialization;
    const parentReceipt = receiptsByArtifactId.get(parentArtifactId);
    if (
      !parentReceipt ||
      parentReceipt.materialization.kind !== 'archive' ||
      parentReceipt.materialization.materializationPolicy !== FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY
    ) {
      invalidContract(
        `preparedPlan.artifactReceipts artifactRef ${firstReceipt.artifactRef} has no trusted archive parent`
      );
    }
    matchingReceipts.forEach(receipt => {
      if (
        receipt.materialization.kind !== 'archive-entry' ||
        receipt.materialization.parentArtifactId !== parentArtifactId ||
        receipt.size !== firstReceipt.size ||
        receipt.sha256.toLowerCase() !== firstReceipt.sha256.toLowerCase() ||
        receipt.integrity !== firstReceipt.integrity ||
        receipt.leaseId !== firstReceipt.leaseId ||
        receipt.role !== firstReceipt.role ||
        receipt.target !== firstReceipt.target
      ) {
        invalidContract(
          `preparedPlan.artifactReceipts artifactRef ${firstReceipt.artifactRef} has conflicting receipt metadata`
        );
      }
    });
  });
};

export const validateFirmwareManifestSnapshotContract = (
  value: unknown
): FirmwareManifestSnapshot => {
  const snapshot = assertRecord(value, 'manifestSnapshot');
  assertExactKeys(
    snapshot,
    [
      'schemaVersion',
      'snapshotDigest',
      'catalogEpoch',
      'source',
      'sourceProjectionDigest',
      'artifactCatalog',
      'releases',
    ],
    [],
    'manifestSnapshot'
  );
  if (snapshot.schemaVersion !== FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION) {
    invalidContract('manifestSnapshot.schemaVersion is unsupported');
  }
  assertSha256(snapshot.snapshotDigest, 'manifestSnapshot.snapshotDigest');
  assertSafeInteger(snapshot.catalogEpoch, 'manifestSnapshot.catalogEpoch');
  if (!SNAPSHOT_SOURCES.has(snapshot.source as FirmwareManifestSnapshot['source'])) {
    invalidContract('manifestSnapshot.source is unsupported');
  }
  assertSha256(snapshot.sourceProjectionDigest, 'manifestSnapshot.sourceProjectionDigest');
  const artifacts = assertArray(snapshot.artifactCatalog, 'manifestSnapshot.artifactCatalog').map(
    (item, index) => validateArtifactRequirement(item, `manifestSnapshot.artifactCatalog[${index}]`)
  );
  const artifactIds = artifacts.map(item => item.artifactId);
  if (new Set(artifactIds).size !== artifactIds.length) {
    invalidContract(
      'manifestSnapshot.artifactCatalog must not contain duplicate artifactId values'
    );
  }
  const releases = assertArray(snapshot.releases, 'manifestSnapshot.releases').map((item, index) =>
    validateManifestRelease(item, `manifestSnapshot.releases[${index}]`)
  );
  const releaseIds = releases.map(item => item.releaseId);
  if (new Set(releaseIds).size !== releaseIds.length) {
    invalidContract('manifestSnapshot.releases must not contain duplicate releaseId values');
  }
  return value as FirmwareManifestSnapshot;
};

export const validateFirmwareUpdatePlanContract = (value: unknown): FirmwareUpdatePlan => {
  const plan = assertRecord(value, 'plan');
  assertExactKeys(
    plan,
    [
      'schemaVersion',
      'planId',
      'planDigest',
      'manifestSnapshotDigest',
      'manifestMode',
      'catalogEpoch',
      'device',
      'artifacts',
      'epochs',
      'expectedFinalStates',
    ],
    [],
    'plan'
  );
  if (plan.schemaVersion !== FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION) {
    invalidContract('plan.schemaVersion is unsupported');
  }
  assertNonEmptyString(plan.planId, 'plan.planId');
  assertSha256(plan.planDigest, 'plan.planDigest');
  assertSha256(plan.manifestSnapshotDigest, 'plan.manifestSnapshotDigest');
  if (plan.manifestMode !== 'external-only' && plan.manifestMode !== 'sdk-managed') {
    invalidContract('plan.manifestMode is unsupported');
  }
  assertSafeInteger(plan.catalogEpoch, 'plan.catalogEpoch');
  validateDeviceIdentity(plan.device, 'plan.device');
  const artifacts = assertArray(plan.artifacts, 'plan.artifacts').map((item, index) =>
    validateArtifactRequirement(item, `plan.artifacts[${index}]`)
  );
  const artifactIds = artifacts.map(item => item.artifactId);
  if (new Set(artifactIds).size !== artifactIds.length) {
    invalidContract('plan.artifacts must not contain duplicate artifactId values');
  }
  validateEpochsAndFinalStates(plan.epochs, plan.expectedFinalStates);
  return value as FirmwareUpdatePlan;
};

export const validatePreparedPlanContract = (value: unknown): PreparedPlan => {
  rejectPreparedPlanLeaks(value, 'preparedPlan', new Set());
  const plan = assertRecord(value, 'preparedPlan');
  assertExactKeys(
    plan,
    [
      'schemaVersion',
      'planId',
      'planDigest',
      'manifestSnapshotDigest',
      'catalogEpoch',
      'networkPolicy',
      'device',
      'artifactReceipts',
      'epochs',
      'expectedFinalStates',
    ],
    [],
    'preparedPlan'
  );
  if (plan.schemaVersion !== FIRMWARE_PREPARED_PLAN_SCHEMA_VERSION) {
    invalidContract('preparedPlan.schemaVersion is unsupported');
  }
  assertNonEmptyString(plan.planId, 'preparedPlan.planId');
  assertSha256(plan.planDigest, 'preparedPlan.planDigest');
  assertSha256(plan.manifestSnapshotDigest, 'preparedPlan.manifestSnapshotDigest');
  assertSafeInteger(plan.catalogEpoch, 'preparedPlan.catalogEpoch');
  if (plan.networkPolicy !== 'forbid') {
    invalidContract('preparedPlan.networkPolicy must be forbid');
  }
  validateDeviceIdentity(plan.device, 'preparedPlan.device');
  const receipts = assertArray(plan.artifactReceipts, 'preparedPlan.artifactReceipts').map(
    (item, index) => validateArtifactReceipt(item, `preparedPlan.artifactReceipts[${index}]`)
  );
  const artifactIds = receipts.map(item => item.artifactId);
  if (new Set(artifactIds).size !== artifactIds.length) {
    invalidContract('preparedPlan.artifactReceipts must not contain duplicate artifactId values');
  }
  validateArtifactReceiptRefs(receipts);
  validateEpochsAndFinalStates(plan.epochs, plan.expectedFinalStates);
  return value as PreparedPlan;
};

export const validateFirmwareCheckpoint = (value: unknown): FirmwareCheckpoint => {
  const checkpoint = assertRecord(value, 'checkpoint');
  assertExactKeys(
    checkpoint,
    ['schemaVersion', 'transactionId', 'planDigest', 'sequence', 'state', 'timestampMs'],
    [
      'generation',
      'deviceIdentity',
      'epochId',
      'artifactId',
      'artifactOffset',
      'target',
      'completedArtifactIds',
      'completedEpochIds',
      'destructiveActionStarted',
      'terminal',
      'installRequestStatus',
      'deviceState',
    ],
    'checkpoint'
  );
  if (checkpoint.schemaVersion !== FIRMWARE_CHECKPOINT_SCHEMA_VERSION) {
    invalidContract('checkpoint.schemaVersion is unsupported');
  }
  assertNonEmptyString(checkpoint.transactionId, 'checkpoint.transactionId');
  assertSha256(checkpoint.planDigest, 'checkpoint.planDigest');
  assertSafeInteger(checkpoint.sequence, 'checkpoint.sequence');
  if (!TRANSACTION_STATES.has(checkpoint.state as FirmwareTransactionState)) {
    invalidContract('checkpoint.state is unsupported');
  }
  assertSafeInteger(checkpoint.timestampMs, 'checkpoint.timestampMs');
  if (checkpoint.generation !== undefined) {
    assertSafeInteger(checkpoint.generation, 'checkpoint.generation');
  }
  if (checkpoint.deviceIdentity !== undefined) {
    assertNonEmptyString(checkpoint.deviceIdentity, 'checkpoint.deviceIdentity');
  }
  if (checkpoint.epochId !== undefined) {
    assertNonEmptyString(checkpoint.epochId, 'checkpoint.epochId');
  }
  if (checkpoint.artifactId !== undefined) {
    assertNonEmptyString(checkpoint.artifactId, 'checkpoint.artifactId');
  }
  if (checkpoint.artifactOffset !== undefined) {
    assertSafeInteger(checkpoint.artifactOffset, 'checkpoint.artifactOffset');
  }
  if (
    checkpoint.target !== undefined &&
    !FIRMWARE_TARGETS.has(checkpoint.target as FirmwareTarget)
  ) {
    invalidContract('checkpoint.target is unsupported');
  }
  if (checkpoint.completedArtifactIds !== undefined) {
    assertUniqueStrings(checkpoint.completedArtifactIds, 'checkpoint.completedArtifactIds');
  }
  if (checkpoint.completedEpochIds !== undefined) {
    assertUniqueStrings(checkpoint.completedEpochIds, 'checkpoint.completedEpochIds');
  }
  if (
    checkpoint.destructiveActionStarted !== undefined &&
    typeof checkpoint.destructiveActionStarted !== 'boolean'
  ) {
    invalidContract('checkpoint.destructiveActionStarted must be a boolean');
  }
  if (checkpoint.terminal !== undefined && typeof checkpoint.terminal !== 'boolean') {
    invalidContract('checkpoint.terminal must be a boolean');
  }
  if (
    checkpoint.installRequestStatus !== undefined &&
    checkpoint.installRequestStatus !== 'not-requested' &&
    checkpoint.installRequestStatus !== 'request-pending' &&
    checkpoint.installRequestStatus !== 'acknowledged'
  ) {
    invalidContract('checkpoint.installRequestStatus is unsupported');
  }
  if (checkpoint.deviceState !== undefined) {
    assertJsonValue(checkpoint.deviceState, 'checkpoint.deviceState');
  }
  return value as FirmwareCheckpoint;
};
