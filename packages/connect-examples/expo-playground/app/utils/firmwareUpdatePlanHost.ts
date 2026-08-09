import { sha256 } from '@noble/hashes/sha256';
import JSZip from 'jszip';
import { prepareFirmwareUpdateV4MemoryHost } from '@onekeyfe/hd-core';

import type {
  CoreApi,
  FirmwareMemoryArtifact,
  FirmwareUpdatePlan,
  FirmwareUpdateV4MemoryHost,
  FirmwareUpdateV4Target,
} from '@onekeyfe/hd-core';

type FetchResponse = {
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type Fetcher = (url: string) => Promise<FetchResponse>;

export type FirmwarePlanArtifactOverrides = Partial<Record<FirmwareUpdateV4Target, ArrayBuffer>>;

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

const MAX_ZIP_ENTRY_COUNT = 512;
const MAX_ZIP_ENTRY_BYTES = 256 * 1024 * 1024;
const MAX_ZIP_TOTAL_BYTES = 256 * 1024 * 1024;

type JSZipSizedEntry = JSZip.JSZipObject & {
  _data?: { compressedSize?: unknown; uncompressedSize?: unknown };
};

async function materializeZipEntries(zip: JSZip, archiveSize: number) {
  const zipEntries = Object.values(zip.files);
  if (
    zipEntries.some(entry => entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name)
  ) {
    throw new Error('Firmware ZIP contains an unsafe entry path');
  }
  const entries = zipEntries.filter(entry => !entry.dir);
  if (entries.length === 0 || entries.length > MAX_ZIP_ENTRY_COUNT) {
    throw new Error('Firmware ZIP entry set is invalid');
  }
  let totalCompressedBytes = 0;
  let totalUncompressedBytes = 0;
  for (const entry of entries) {
    const { compressedSize, uncompressedSize } = (entry as JSZipSizedEntry)._data ?? {};
    if (
      !Number.isSafeInteger(compressedSize) ||
      Number(compressedSize) < 0 ||
      !Number.isSafeInteger(uncompressedSize) ||
      Number(uncompressedSize) <= 0
    ) {
      throw new Error(`Firmware ZIP entry size is invalid: ${entry.name}`);
    }
    totalCompressedBytes += Number(compressedSize);
    totalUncompressedBytes += Number(uncompressedSize);
    if (
      Number(uncompressedSize) > MAX_ZIP_ENTRY_BYTES ||
      totalCompressedBytes > archiveSize ||
      totalUncompressedBytes > MAX_ZIP_TOTAL_BYTES
    ) {
      throw new Error('Firmware ZIP declared size exceeds the allowed limit');
    }
  }
  const materializedEntries: Array<{ entryName: string; binary: ArrayBuffer }> = [];
  for (const entry of entries) {
    const binary = await entry.async('arraybuffer');
    if (binary.byteLength !== Number((entry as JSZipSizedEntry)._data?.uncompressedSize)) {
      throw new Error(`Firmware ZIP entry size mismatch: ${entry.name}`);
    }
    materializedEntries.push({ entryName: entry.name, binary });
  }
  return materializedEntries;
}

async function loadPlanArtifact({
  artifact,
  override,
  fetcher,
}: {
  artifact: FirmwareUpdatePlan['artifacts'][number];
  override?: ArrayBuffer;
  fetcher: Fetcher;
}): Promise<FirmwareMemoryArtifact> {
  let binary = override;
  if (!binary) {
    const response = await fetcher(artifact.url);
    if (!response.ok) {
      throw new Error(
        `Failed to download firmware artifact ${artifact.artifactId} (${response.status})`
      );
    }
    binary = await response.arrayBuffer();
  }
  if (artifact.expectedSize !== undefined && binary.byteLength !== artifact.expectedSize) {
    throw new Error(`Firmware artifact size mismatch: ${artifact.artifactId}`);
  }
  const digest = bytesToHex(sha256(new Uint8Array(binary)));
  if (artifact.expectedSha256 !== undefined && digest !== artifact.expectedSha256.toLowerCase()) {
    throw new Error(`Firmware artifact SHA-256 mismatch: ${artifact.artifactId}`);
  }
  if (artifact.container === 'raw') {
    return { artifactId: artifact.artifactId, binary };
  }
  const zip = await JSZip.loadAsync(binary);
  return {
    artifactId: artifact.artifactId,
    binary,
    materializedEntries: await materializeZipEntries(zip, binary.byteLength),
  };
}
export async function prepareFirmwareUpdatePlanMemoryHost({
  hardwareSDK,
  plan,
  overrides = {},
  fetcher = fetch as Fetcher,
}: {
  hardwareSDK: CoreApi;
  plan: FirmwareUpdatePlan;
  overrides?: FirmwarePlanArtifactOverrides;
  fetcher?: Fetcher;
}): Promise<FirmwareUpdateV4MemoryHost> {
  const artifacts = await Promise.all(
    plan.artifacts.map(artifact =>
      loadPlanArtifact({
        artifact,
        override: overrides[artifact.target as FirmwareUpdateV4Target],
        fetcher,
      })
    )
  );
  return prepareFirmwareUpdateV4MemoryHost({
    sdk: hardwareSDK,
    plan,
    artifacts,
  });
}
