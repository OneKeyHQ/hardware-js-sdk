import { FirmwareUpdateErrorCode, buildFirmwareUpdatePlan } from '../../src/firmware-update';
import { createManifestSnapshot } from './manifest-plan-fixtures';

import type {
  FirmwareArtifactRequirement,
  FirmwareManifestRelease,
} from '../../src/firmware-update';

const expectPlanError = (callback: () => unknown) => {
  try {
    callback();
    throw new Error('Expected firmware plan validation to fail');
  } catch (error) {
    expect(error).toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwarePlanInvalid,
    });
  }
};

const firmwareArtifact: FirmwareArtifactRequirement = {
  artifactId: 'classic1s-firmware-4.0.0',
  role: 'firmware' as const,
  sourceUrls: ['https://firmware.example.com/classic1s/firmware-4.0.0.bin'],
  expectedSize: 4096,
  expectedSha256: '4'.repeat(64),
  integrity: 'signed-manifest' as const,
  container: { kind: 'raw' as const },
  target: 'firmware' as const,
  devicePathRule: { kind: 'none' as const },
  dependsOn: [],
};

const bootloaderArtifact: FirmwareArtifactRequirement = {
  artifactId: 'classic1s-bootloader-2.9.0',
  role: 'bootloader' as const,
  sourceUrls: ['https://firmware.example.com/classic1s/bootloader-2.9.0.bin'],
  expectedSize: 2048,
  expectedSha256: 'b'.repeat(64),
  integrity: 'signed-manifest' as const,
  container: { kind: 'raw' as const },
  target: 'bootloader' as const,
  targetVersion: '2.9.0',
  devicePathRule: { kind: 'none' as const },
  dependsOn: [],
};

const combinedRelease: FirmwareManifestRelease = {
  releaseId: 'classic1s-universal-stable-4.0.0',
  deviceModel: 'classic1s',
  firmwareType: 'universal',
  channel: 'stable' as const,
  version: '4.0.0',
  required: false,
  artifactIds: [firmwareArtifact.artifactId, bootloaderArtifact.artifactId],
};

const buildClassicPlan = ({
  artifacts = [firmwareArtifact, bootloaderArtifact],
  release = combinedRelease,
  firmware = '3.0.0',
  bootloader = '2.9.0',
}: {
  artifacts?: readonly FirmwareArtifactRequirement[];
  release?: FirmwareManifestRelease;
  firmware?: string;
  bootloader?: string;
} = {}) =>
  buildFirmwareUpdatePlan({
    manifestSnapshot: createManifestSnapshot({
      artifacts,
      releases: [release],
    }),
    manifestMode: 'external-only',
    deviceSnapshot: {
      identity: 'device-identity-1',
      model: 'classic1s',
      firmwareType: 'universal',
      currentVersions: { firmware, bootloader },
    },
    channel: 'stable',
  });

describe('firmware plan target selection', () => {
  it('prunes an up-to-date bootloader from a newer firmware release', () => {
    const plan = buildClassicPlan();

    expect(plan.artifacts.map(artifact => artifact.target)).toEqual(['firmware']);
    expect(plan.expectedFinalStates.map(state => state.target)).toEqual(['firmware']);
  });

  it('retains an outdated bootloader from a newer firmware release', () => {
    const plan = buildClassicPlan({ bootloader: '2.8.0' });

    expect(plan.artifacts.map(artifact => artifact.target)).toEqual(['bootloader', 'firmware']);
    expect(plan.epochs.map(epoch => epoch.kind)).toEqual([
      'bootloader-install',
      'bootloader-verify',
      'component-install',
      'final-verify',
    ]);
  });

  it('prunes current firmware while selecting an outdated bundled bootloader', () => {
    const plan = buildClassicPlan({
      firmware: '4.0.0',
      bootloader: '2.8.0',
    });

    expect(plan.artifacts).toEqual([bootloaderArtifact]);
  });

  it('selects a bootloader-only release when firmware is already current', () => {
    const release = {
      ...combinedRelease,
      releaseId: 'classic1s-universal-stable-4.0.0-bootloader',
      artifactIds: [bootloaderArtifact.artifactId],
    };
    const plan = buildClassicPlan({
      artifacts: [bootloaderArtifact],
      release,
      firmware: '4.0.0',
      bootloader: '2.8.0',
    });

    expect(plan.artifacts).toEqual([bootloaderArtifact]);
    expect(plan.expectedFinalStates).toEqual([
      {
        target: 'bootloader',
        version: '2.9.0',
        sha256: bootloaderArtifact.expectedSha256,
      },
    ]);
  });

  it('fails closed instead of pruning a retained artifact dependency', () => {
    const dependentFirmware = {
      ...firmwareArtifact,
      dependsOn: [bootloaderArtifact.artifactId],
    };

    expectPlanError(() =>
      buildClassicPlan({
        artifacts: [dependentFirmware, bootloaderArtifact],
      })
    );
  });
});
