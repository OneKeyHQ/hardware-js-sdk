import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import JSZip from 'jszip';

import { readVerifiedFirmwareArtifact } from './FirmwareArtifactSource';
import { getFirmwareUpdateResourceName } from './FirmwareUpdatePreparedPlan';

import type { FirmwareArtifactReader } from '../../types/api/firmwareUpdate';
import type { FirmwareUpdatePreparedPlan } from '../../types/api/firmwareUpdatePreparedPlan';

const PREPARED_RESOURCE_ARCHIVE_MAX_BYTES = 256 * 1024 * 1024;
const PREPARED_RESOURCE_ENTRY_MAX_COUNT = 512;

type JSZipSizedEntry = JSZip.JSZipObject & {
  _data?: {
    compressedSize?: unknown;
    uncompressedSize?: unknown;
  };
};

export type VerifiedPreparedResourceEntry = {
  entryName: string;
  binary: ArrayBuffer;
};

const resourceArchiveError = (
  message: string,
  firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' | 'FirmwareArtifactReceiptMismatch'
): never => {
  throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, message, { firmwareUpdateCode });
};

const getZipEntrySizes = (entry: JSZip.JSZipObject) => {
  const { compressedSize, uncompressedSize } = (entry as JSZipSizedEntry)._data ?? {};
  if (
    !Number.isSafeInteger(compressedSize) ||
    Number(compressedSize) < 0 ||
    !Number.isSafeInteger(uncompressedSize) ||
    Number(uncompressedSize) <= 0
  ) {
    return resourceArchiveError(
      `Firmware prepared resource ZIP entry size is invalid: ${entry.name}`,
      'FirmwareArtifactsNotPrepared'
    );
  }
  return {
    compressedSize: Number(compressedSize),
    uncompressedSize: Number(uncompressedSize),
  };
};

/**
 * 从 PreparedPlan 批准的 ZIP 本体生成资源条目。
 * 宿主提供的 materializedEntries 仅作为 receipt，设备写入始终使用 ZIP 内的规范字节。
 */
export const readVerifiedPreparedResourceArchive = async ({
  preparedPlan,
  reader,
}: {
  preparedPlan: FirmwareUpdatePreparedPlan;
  reader: FirmwareArtifactReader | undefined;
}): Promise<VerifiedPreparedResourceEntry[]> => {
  const resourceArtifacts = preparedPlan.artifacts.filter(
    artifact => artifact.target === 'resource'
  );
  if (!preparedPlan.targetsToUpdate.includes('resource')) {
    if (resourceArtifacts.length > 0) {
      return resourceArchiveError(
        'Firmware prepared resource artifact is outside the approved targets',
        'FirmwareArtifactsNotPrepared'
      );
    }
    return [];
  }
  if (resourceArtifacts.length !== 1) {
    return resourceArchiveError(
      'Firmware prepared plan must contain exactly one materialized resource ZIP',
      'FirmwareArtifactsNotPrepared'
    );
  }

  const archiveArtifact = resourceArtifacts[0];
  const preparedEntries = archiveArtifact.materializedEntries;
  if (
    archiveArtifact.role !== 'resource' ||
    archiveArtifact.container !== 'zip' ||
    !preparedEntries?.length
  ) {
    return resourceArchiveError(
      'Firmware prepared plan must contain exactly one materialized resource ZIP',
      'FirmwareArtifactsNotPrepared'
    );
  }
  if (archiveArtifact.artifact.size > PREPARED_RESOURCE_ARCHIVE_MAX_BYTES) {
    return resourceArchiveError(
      'Firmware prepared resource ZIP exceeds the archive size limit',
      'FirmwareArtifactsNotPrepared'
    );
  }

  const archiveBinary = await readVerifiedFirmwareArtifact({
    artifact: archiveArtifact.artifact,
    reader,
  });

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(archiveBinary);
  } catch {
    return resourceArchiveError(
      'Firmware prepared resource ZIP cannot be parsed',
      'FirmwareArtifactsNotPrepared'
    );
  }
  const zipEntries = Object.values(zip.files);
  if (
    zipEntries.some(entry => entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name)
  ) {
    return resourceArchiveError(
      'Firmware prepared resource ZIP contains an unsafe entry path',
      'FirmwareArtifactsNotPrepared'
    );
  }
  const files = zipEntries.filter(entry => !entry.dir);
  if (files.length === 0 || files.length > PREPARED_RESOURCE_ENTRY_MAX_COUNT) {
    return resourceArchiveError(
      'Firmware prepared resource ZIP entry set is invalid',
      'FirmwareArtifactsNotPrepared'
    );
  }

  let totalSize = 0;
  const canonicalNames = new Set<string>();
  for (const entry of files) {
    const { compressedSize, uncompressedSize } = getZipEntrySizes(entry);
    const resourceName = getFirmwareUpdateResourceName(entry.name);
    const canonicalName = resourceName.toLowerCase();
    totalSize += uncompressedSize;
    if (
      compressedSize > archiveBinary.byteLength ||
      uncompressedSize > PREPARED_RESOURCE_ARCHIVE_MAX_BYTES ||
      totalSize > PREPARED_RESOURCE_ARCHIVE_MAX_BYTES ||
      canonicalNames.has(canonicalName)
    ) {
      return resourceArchiveError(
        `Firmware prepared resource ZIP entry bounds are invalid: ${entry.name}`,
        'FirmwareArtifactsNotPrepared'
      );
    }
    canonicalNames.add(canonicalName);
  }

  const preparedEntriesByName = new Map(
    preparedEntries.map(entry => [entry.entryName, entry] as const)
  );
  if (preparedEntriesByName.size !== files.length || preparedEntries.length !== files.length) {
    return resourceArchiveError(
      'Firmware prepared resource entries do not match the approved ZIP',
      'FirmwareArtifactReceiptMismatch'
    );
  }

  const verifiedEntries: VerifiedPreparedResourceEntry[] = [];
  for (const entry of files) {
    const { uncompressedSize } = getZipEntrySizes(entry);
    const binary = await entry.async('arraybuffer');
    const preparedEntry = preparedEntriesByName.get(entry.name);
    const digest = bytesToHex(sha256(new Uint8Array(binary)));
    if (
      binary.byteLength !== uncompressedSize ||
      !preparedEntry ||
      preparedEntry.artifact.size !== binary.byteLength ||
      preparedEntry.artifact.sha256.toLowerCase() !== digest
    ) {
      return resourceArchiveError(
        `Firmware prepared resource entry does not match the approved ZIP: ${entry.name}`,
        'FirmwareArtifactReceiptMismatch'
      );
    }
    verifiedEntries.push({
      entryName: getFirmwareUpdateResourceName(entry.name),
      binary,
    });
  }
  return verifiedEntries;
};
