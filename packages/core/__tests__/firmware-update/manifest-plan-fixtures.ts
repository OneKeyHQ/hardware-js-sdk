import { computeFirmwareManifestSnapshotDigest } from '../../src/firmware-update';

import type {
  FirmwareArtifactRequirement,
  FirmwareManifestRelease,
  FirmwareManifestSnapshot,
} from '../../src/firmware-update';

export const SHA256_FIRMWARE_V3 = '3'.repeat(64);
export const SHA256_FIRMWARE_V4 = '4'.repeat(64);
export const SHA256_BOOTLOADER = 'b'.repeat(64);
export const SOURCE_PROJECTION_DIGEST = 'c'.repeat(64);

export const classicFirmwareV3: FirmwareArtifactRequirement = {
  artifactId: 'classic1s-firmware-3.0.0',
  role: 'firmware',
  sourceUrls: ['https://firmware.example.com/classic1s/3.0.0.bin'],
  expectedSize: 3072,
  expectedSha256: SHA256_FIRMWARE_V3,
  integrity: 'catalog-trusted',
  container: { kind: 'raw' },
  target: 'firmware',
  targetVersion: '3.0.0',
  devicePathRule: { kind: 'none' },
  dependsOn: [],
};

export const classicFirmwareV4: FirmwareArtifactRequirement = {
  artifactId: 'classic1s-firmware-4.0.0',
  role: 'firmware',
  sourceUrls: ['https://firmware.example.com/classic1s/4.0.0.bin'],
  expectedSize: 4096,
  expectedSha256: SHA256_FIRMWARE_V4,
  integrity: 'catalog-trusted',
  container: { kind: 'raw' },
  target: 'firmware',
  targetVersion: '4.0.0',
  devicePathRule: { kind: 'none' },
  dependsOn: [],
};

export const classicStableV3: FirmwareManifestRelease = {
  releaseId: 'classic1s-universal-stable-3.0.0',
  deviceModel: 'classic1s',
  firmwareType: 'universal',
  channel: 'stable',
  version: '3.0.0',
  required: false,
  artifactIds: [classicFirmwareV3.artifactId],
};

export const classicStableV4: FirmwareManifestRelease = {
  releaseId: 'classic1s-universal-stable-4.0.0',
  deviceModel: 'classic1s',
  firmwareType: 'universal',
  channel: 'stable',
  version: '4.0.0',
  required: false,
  artifactIds: [classicFirmwareV4.artifactId],
};

export const createManifestSnapshot = ({
  artifacts = [classicFirmwareV3, classicFirmwareV4],
  releases = [classicStableV3, classicStableV4],
  source = 'app-bundled-catalog',
  catalogEpoch = 12,
}: {
  artifacts?: readonly FirmwareArtifactRequirement[];
  releases?: readonly FirmwareManifestRelease[];
  source?: FirmwareManifestSnapshot['source'];
  catalogEpoch?: number;
} = {}): FirmwareManifestSnapshot => {
  const draft = {
    schemaVersion: 2,
    catalogEpoch,
    source,
    sourceProjectionDigest: SOURCE_PROJECTION_DIGEST,
    artifactCatalog: artifacts,
    releases,
  } as const;

  return {
    ...draft,
    snapshotDigest: computeFirmwareManifestSnapshotDigest(draft),
  };
};

export const createPro2Artifact = (
  target: 'bootloader' | 'p1' | 'p2' | 'coprocessor' | 'se01' | 'se02' | 'se03' | 'se04'
): FirmwareArtifactRequirement => {
  const digestNibble = String(PRO2_TARGETS.indexOf(target) + 1);
  return {
    artifactId: `pro2-${target}-1.0.0`,
    role: target === 'bootloader' ? 'bootloader' : 'component',
    sourceUrls: [`https://pro2-firmware.example.com/${target}/1.0.0.bin`],
    expectedSize: 1024,
    expectedSha256: digestNibble.repeat(64),
    integrity: 'signed-manifest',
    container: { kind: 'raw' },
    target,
    targetVersion: '1.0.0',
    devicePathRule: { kind: 'none' },
    dependsOn: [],
  };
};

export const PRO2_TARGETS = [
  'bootloader',
  'p1',
  'p2',
  'coprocessor',
  'se01',
  'se02',
  'se03',
  'se04',
] as const;
