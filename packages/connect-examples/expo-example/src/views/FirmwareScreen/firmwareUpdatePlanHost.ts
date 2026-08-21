import { sha256 } from '@noble/hashes/sha256';

import type {
  FirmwareUpdatePlan,
  FirmwareUpdateV4Params,
  FirmwareUpdateV4Target,
} from '@onekeyfe/hd-core';

type FetchResponse = {
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type Fetcher = (url: string) => Promise<FetchResponse>;

export type FirmwarePlanArtifactOverrides = Partial<Record<FirmwareUpdateV4Target, ArrayBuffer>>;

export type FirmwareUpdatePlanBinaryParams = Pick<
  FirmwareUpdateV4Params,
  | 'targetsToUpdate'
  | 'bootloaderBinary'
  | 'applicationP1Binary'
  | 'applicationP2Binary'
  | 'coprocessorBinary'
  | 'se01Binary'
  | 'se02Binary'
  | 'se03Binary'
  | 'se04Binary'
  | 'resourceArchiveBinary'
>;

const PLAN_TARGET_BINARY_FIELDS = {
  boot: 'bootloaderBinary',
  app_v1: 'applicationP1Binary',
  app_v2: 'applicationP2Binary',
  coprocessor: 'coprocessorBinary',
  se01: 'se01Binary',
  se02: 'se02Binary',
  se03: 'se03Binary',
  se04: 'se04Binary',
  resource: 'resourceArchiveBinary',
} as const;

type PlanBinaryTarget = keyof typeof PLAN_TARGET_BINARY_FIELDS;
type PlanBinaryField = (typeof PLAN_TARGET_BINARY_FIELDS)[PlanBinaryTarget];

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

const isPlanBinaryTarget = (target: string): target is PlanBinaryTarget =>
  Object.prototype.hasOwnProperty.call(PLAN_TARGET_BINARY_FIELDS, target);

async function loadPlanArtifactBinary({
  artifact,
  override,
  fetcher,
}: {
  artifact: FirmwareUpdatePlan['artifacts'][number];
  override?: ArrayBuffer;
  fetcher: Fetcher;
}): Promise<ArrayBuffer> {
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
  return binary;
}

export async function loadFirmwareUpdatePlanBinaries({
  plan,
  overrides = {},
  fetcher = fetch as Fetcher,
}: {
  plan: FirmwareUpdatePlan;
  overrides?: FirmwarePlanArtifactOverrides;
  fetcher?: Fetcher;
}): Promise<FirmwareUpdatePlanBinaryParams> {
  if (plan.artifacts.length === 0) {
    throw new Error('Firmware update Plan has no artifacts');
  }

  const loaded = await Promise.all(
    plan.artifacts.map(async artifact => {
      if (!isPlanBinaryTarget(artifact.target)) {
        throw new Error(`Firmware update Plan target is not a V4 binary: ${artifact.target}`);
      }
      const field: PlanBinaryField = PLAN_TARGET_BINARY_FIELDS[artifact.target];
      const binary = await loadPlanArtifactBinary({
        artifact,
        override: overrides[artifact.target],
        fetcher,
      });
      return { target: artifact.target, field, binary };
    })
  );

  const binaries: FirmwareUpdatePlanBinaryParams = {
    targetsToUpdate: [],
  };
  const loadedTargets: FirmwareUpdateV4Target[] = [];
  for (const item of loaded) {
    if (binaries[item.field]) {
      throw new Error(`Firmware update Plan has duplicate target ${item.target}`);
    }
    binaries[item.field] = item.binary;
    loadedTargets.push(item.target);
  }

  binaries.targetsToUpdate = [...new Set(loadedTargets)];
  return binaries;
}
