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
  const entries = Object.values(zip.files).filter(entry => !entry.dir);
  if (entries.length === 0 || entries.length > 512) {
    throw new Error('Firmware ZIP entry set is invalid');
  }
  return {
    artifactId: artifact.artifactId,
    binary,
    materializedEntries: await Promise.all(
      entries.map(async entry => ({
        entryName: entry.name,
        binary: await entry.async('arraybuffer'),
      }))
    ),
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
