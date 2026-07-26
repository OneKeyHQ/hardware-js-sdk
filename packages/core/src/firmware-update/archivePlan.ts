import { sha256CanonicalFirmwareJson } from './canonical';
import {
  FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY,
  type FirmwareArtifactReceipt,
  type FirmwareUpdatePlan,
} from './contracts';
import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';
import { validateFirmwareUpdatePlan } from './planDigest';

const MAX_ARCHIVE_ENTRY_COUNT = 4096;
const MAX_ARCHIVE_ENTRY_SIZE = 128 * 1024 * 1024;
const MAX_ARCHIVE_TOTAL_SIZE = 512 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_ID_LENGTH = 1024;
const MAX_FIRMWARE_LOGICAL_NAME_BYTES = 128;
const UTF8_ENCODER = new TextEncoder();
const WINDOWS_DRIVE_PREFIX = /^[a-z]:/i;
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const NESTED_ARCHIVE_EXTENSIONS = new Set([
  '7z',
  'bz2',
  'cab',
  'gz',
  'rar',
  'tar',
  'tgz',
  'xz',
  'zip',
]);

export interface FirmwareArchiveEntryIdentityInput {
  parentArtifactId: string;
  entryId: string;
  size: number;
  sha256: string;
}

export interface FirmwareArchiveReceiptExpansion {
  parentArtifactId: string;
  parentReceipt: FirmwareArtifactReceipt;
  childReceipts: readonly FirmwareArtifactReceipt[];
}

const planError = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwarePlanInvalid, detail, {
    detail,
  });
};

const materializationError = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareArtifactReceiptMismatch, detail, {
    detail,
  });
};

const normalizeArchiveKey = (value: string) =>
  value.normalize('NFC').toUpperCase().toLowerCase().normalize('NFC');

const utf8ByteLength = (value: string) => UTF8_ENCODER.encode(value).byteLength;

const compareCanonicalStrings = (left: string, right: string): number => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

const hasControlCharacter = (value: string) =>
  Array.from(value).some(character => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });

const assertSafePathComponent = (value: string, context: string): string => {
  if (
    value.length === 0 ||
    value === '.' ||
    value === '..' ||
    value.endsWith('.') ||
    value.endsWith(' ') ||
    WINDOWS_RESERVED_NAME.test(value)
  ) {
    return planError(`${context} contains an unsafe path component`);
  }
  return value;
};

export const validateFirmwareArchiveEntryId = (value: string): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_ARCHIVE_ENTRY_ID_LENGTH ||
    value !== value.normalize('NFC') ||
    hasControlCharacter(value) ||
    value.startsWith('/') ||
    value.startsWith('\\') ||
    WINDOWS_DRIVE_PREFIX.test(value) ||
    value.includes('\\') ||
    value.includes(':')
  ) {
    return planError('Firmware archive entryId is unsafe');
  }
  const components = value.split('/');
  if (components.some(component => component.length === 0)) {
    return planError('Firmware archive entryId contains an empty path component');
  }
  components.forEach((component, index) => {
    assertSafePathComponent(component, `Firmware archive entryId component ${index}`);
  });
  return value;
};

export const validateFirmwareLogicalName = (value: string): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    utf8ByteLength(value) > MAX_FIRMWARE_LOGICAL_NAME_BYTES ||
    value !== value.normalize('NFC') ||
    hasControlCharacter(value) ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes(':')
  ) {
    return planError('Firmware logical name is unsafe');
  }
  return assertSafePathComponent(value, 'Firmware logical name');
};

export const createFirmwareArchiveEntryArtifactId = ({
  parentArtifactId,
  entryId,
  size,
  sha256,
}: FirmwareArchiveEntryIdentityInput): string =>
  `archive-entry-${sha256CanonicalFirmwareJson({
    parentArtifactId,
    entryId,
    size,
    sha256: sha256.toLowerCase(),
  })}`;

const validateReceiptEntryId = (value: string): string => {
  try {
    return validateFirmwareArchiveEntryId(value);
  } catch {
    return materializationError('Firmware archive receipt entryId is unsafe');
  }
};

const validateReceiptLogicalName = (value: string): string => {
  try {
    return validateFirmwareLogicalName(value);
  } catch {
    return materializationError('Firmware archive receipt logical name is unsafe');
  }
};

const assertArchiveEntryPolicy = (entryId: string) => {
  const components = entryId.split('/');
  if (components.some(component => normalizeArchiveKey(component) === '__macosx')) {
    materializationError(`Firmware archive receipt ${entryId} is excluded by policy`);
  }
  const leaf = components.at(-1) ?? '';
  const extension = leaf.includes('.') ? (leaf.split('.').at(-1) ?? '').toLowerCase() : '';
  if (NESTED_ARCHIVE_EXTENSIONS.has(extension)) {
    materializationError(`Firmware archive receipt ${entryId} is a nested archive`);
  }
};

const sortArchiveChildReceipts = (
  receipts: readonly FirmwareArtifactReceipt[]
): FirmwareArtifactReceipt[] =>
  [...receipts].sort((left, right) => {
    const leftName = normalizeArchiveKey(left.logicalName ?? '');
    const rightName = normalizeArchiveKey(right.logicalName ?? '');
    return (
      compareCanonicalStrings(leftName, rightName) ||
      compareCanonicalStrings(
        normalizeArchiveKey(
          left.materialization.kind === 'archive-entry' ? left.materialization.entryId : ''
        ),
        normalizeArchiveKey(
          right.materialization.kind === 'archive-entry' ? right.materialization.entryId : ''
        )
      ) ||
      compareCanonicalStrings(left.artifactId, right.artifactId)
    );
  });

export const validateFirmwareArchiveReceiptRelationships = (
  receipts: readonly FirmwareArtifactReceipt[]
): readonly FirmwareArchiveReceiptExpansion[] => {
  const receiptsById = new Map(receipts.map(receipt => [receipt.artifactId, receipt]));
  const archiveParents = receipts.filter(receipt => receipt.materialization.kind === 'archive');
  const childrenByParent = new Map<string, FirmwareArtifactReceipt[]>();
  const entryKeys = new Set<string>();
  const logicalNameKeys = new Set<string>();
  let entryCount = 0;
  let totalSize = 0;

  archiveParents.forEach(parent => {
    if (
      parent.materialization.kind !== 'archive' ||
      parent.materialization.materializationPolicy !== FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY ||
      parent.role !== 'resource-bundle' ||
      parent.target !== 'resource' ||
      parent.logicalName !== undefined
    ) {
      materializationError(
        `Firmware archive parent ${parent.artifactId} has invalid execution metadata`
      );
    }
    childrenByParent.set(parent.artifactId, []);
  });

  receipts.forEach(receipt => {
    if (receipt.materialization.kind !== 'archive-entry') {
      return;
    }
    const { parentArtifactId } = receipt.materialization;
    const parent = receiptsById.get(parentArtifactId);
    if (!parent || parent.materialization.kind !== 'archive') {
      return materializationError(
        `Firmware archive receipt ${receipt.artifactId} has no prepared archive parent`
      );
    }
    if (
      receipt.role !== 'archive-entry' ||
      receipt.target !== 'resource' ||
      receipt.integrity !== parent.integrity ||
      receipt.leaseId !== parent.leaseId
    ) {
      return materializationError(
        `Firmware archive receipt ${receipt.artifactId} changed inherited execution metadata`
      );
    }

    const entryId = validateReceiptEntryId(receipt.materialization.entryId);
    assertArchiveEntryPolicy(entryId);
    const logicalName = validateReceiptLogicalName(receipt.logicalName ?? '');
    const expectedLogicalName = validateReceiptLogicalName(entryId.split('/').at(-1) ?? '');
    if (logicalName !== expectedLogicalName) {
      return materializationError(
        `Firmware archive receipt ${receipt.artifactId} logical name does not match its entry`
      );
    }
    if (receipt.size > MAX_ARCHIVE_ENTRY_SIZE) {
      return materializationError(
        `Firmware archive receipt ${receipt.artifactId} exceeds the entry size limit`
      );
    }
    entryCount += 1;
    totalSize += receipt.size;
    if (
      entryCount > MAX_ARCHIVE_ENTRY_COUNT ||
      !Number.isSafeInteger(totalSize) ||
      totalSize > MAX_ARCHIVE_TOTAL_SIZE
    ) {
      return materializationError('Firmware archive receipts exceed materialization limits');
    }

    const entryKey = `${parentArtifactId}\0${normalizeArchiveKey(entryId)}`;
    if (entryKeys.has(entryKey)) {
      return materializationError(`Firmware archive receipts duplicate entry ${entryId}`);
    }
    entryKeys.add(entryKey);
    const logicalNameKey = normalizeArchiveKey(logicalName);
    if (logicalNameKeys.has(logicalNameKey)) {
      return materializationError(
        `Firmware archive receipts collide at logical name ${logicalName}`
      );
    }
    logicalNameKeys.add(logicalNameKey);

    const expectedArtifactId = createFirmwareArchiveEntryArtifactId({
      parentArtifactId,
      entryId,
      size: receipt.size,
      sha256: receipt.sha256,
    });
    if (receipt.artifactId !== expectedArtifactId) {
      return materializationError(
        `Firmware archive receipt ${receipt.artifactId} has a non-deterministic artifactId`
      );
    }
    childrenByParent.get(parentArtifactId)?.push(receipt);
  });

  return archiveParents.map(parentReceipt => {
    const childReceipts = childrenByParent.get(parentReceipt.artifactId) ?? [];
    if (childReceipts.length === 0) {
      return materializationError(
        `Firmware archive parent ${parentReceipt.artifactId} has no materialized entries`
      );
    }
    return {
      parentArtifactId: parentReceipt.artifactId,
      parentReceipt,
      childReceipts: sortArchiveChildReceipts(childReceipts),
    };
  });
};

export const compileFirmwareArchiveReceiptExpansions = (
  planValue: unknown,
  receipts: readonly FirmwareArtifactReceipt[]
): readonly FirmwareArchiveReceiptExpansion[] => {
  const plan: FirmwareUpdatePlan = validateFirmwareUpdatePlan(planValue);
  const archiveArtifactsById = new Map(
    plan.artifacts
      .filter(artifact => artifact.container.kind === 'archive')
      .map(artifact => [artifact.artifactId, artifact])
  );
  const expansions = validateFirmwareArchiveReceiptRelationships(receipts);
  const expansionByParentId = new Map(
    expansions.map(expansion => [expansion.parentArtifactId, expansion])
  );

  expansions.forEach(expansion => {
    const artifact = archiveArtifactsById.get(expansion.parentArtifactId);
    if (
      !artifact ||
      artifact.container.kind !== 'archive' ||
      artifact.container.materializationPolicy !== FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY
    ) {
      materializationError(
        `Firmware archive receipt ${expansion.parentArtifactId} is not declared by its plan`
      );
    }
  });
  archiveArtifactsById.forEach(artifact => {
    if (!expansionByParentId.has(artifact.artifactId)) {
      materializationError(
        `Firmware archive ${artifact.artifactId} has no prepared materialization`
      );
    }
  });

  return plan.artifacts.flatMap(artifact => {
    const expansion = expansionByParentId.get(artifact.artifactId);
    return expansion ? [expansion] : [];
  });
};

export const resolveFirmwareArtifactDevicePath = (receipt: FirmwareArtifactReceipt): string => {
  if (receipt.target === 'resource' || receipt.role === 'archive-entry') {
    if (!receipt.logicalName) {
      return planError(`Firmware artifact ${receipt.artifactId} has no logical name`);
    }
    return `0:res/${validateFirmwareLogicalName(receipt.logicalName)}`;
  }
  if (receipt.target === 'bootloader') {
    return `0:boot/${validateFirmwareLogicalName(receipt.logicalName ?? 'bootloader.bin')}`;
  }
  if (receipt.target === 'firmware') {
    return `0:updates/${validateFirmwareLogicalName(receipt.logicalName ?? 'firmware.bin')}`;
  }
  if (receipt.target === 'ble') {
    return `0:updates/${validateFirmwareLogicalName(receipt.logicalName ?? 'ble-firmware.bin')}`;
  }
  return planError(`Firmware artifact target ${receipt.target} has no V3 device path`);
};
