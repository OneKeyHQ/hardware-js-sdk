import {
  FirmwareUpdateErrorCode,
  buildFirmwareUpdatePlan,
  buildFirmwareUpdatePlanBundle,
  computeFirmwareUpdatePlanDigest,
} from '../../src/firmware-update';
import {
  PRO2_TARGETS,
  classicFirmwareV4,
  classicStableV4,
  createManifestSnapshot,
  createPro2Artifact,
} from './manifest-plan-fixtures';

import type { FirmwareReleaseChannel } from '../../src/firmware-update';

const expectPlanError = (callback: () => unknown) => {
  try {
    callback();
    throw new Error('Expected firmware plan bundle validation to fail');
  } catch (error) {
    expect(error).toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwarePlanInvalid,
    });
  }
};

const createBleFixture = ({
  model = 'classic1s',
  channel = 'stable',
  catalogEpoch = 12,
  artifactId = `${model}-ble-2.1.0`,
}: {
  model?: string;
  channel?: FirmwareReleaseChannel;
  catalogEpoch?: number;
  artifactId?: string;
} = {}) => {
  const artifact = {
    artifactId,
    role: 'ble' as const,
    sourceUrls: [`https://firmware.example.com/${model}/ble-2.1.0.bin`],
    expectedSize: 1024,
    expectedSha256: 'b'.repeat(64),
    integrity: 'signed-manifest' as const,
    container: { kind: 'raw' as const },
    target: 'ble' as const,
    targetVersion: '2.1.0',
    devicePathRule: { kind: 'none' as const },
    dependsOn: [],
  };
  const release = {
    releaseId: `${model}-universal-${channel}-2.1.0-ble`,
    deviceModel: model,
    firmwareType: 'universal',
    channel,
    version: '2.1.0',
    required: false,
    artifactIds: [artifact.artifactId],
  };
  return {
    artifact,
    snapshot: createManifestSnapshot({
      artifacts: [artifact],
      releases: [release],
      catalogEpoch,
    }),
  };
};

const classicInput = {
  manifestMode: 'external-only' as const,
  deviceSnapshot: {
    identity: 'device-identity-1',
    model: 'classic1s',
    firmwareType: 'universal',
    currentVersions: {
      firmware: '3.0.0',
      bootloader: '2.8.0',
      ble: '2.0.0',
    },
  },
  channel: 'stable' as const,
};

describe('firmware update plan bundle', () => {
  it('combines independently selected firmware and BLE releases deterministically', () => {
    const firmwareSnapshot = createManifestSnapshot();
    const ble = createBleFixture();
    const plan = buildFirmwareUpdatePlanBundle({
      ...classicInput,
      manifestSnapshots: [firmwareSnapshot, ble.snapshot],
    });
    const reversed = buildFirmwareUpdatePlanBundle({
      ...classicInput,
      manifestSnapshots: [ble.snapshot, firmwareSnapshot],
    });

    expect(reversed).toEqual(plan);
    expect(plan.planId).toMatch(/^firmware-plan-bundle-[0-9a-f]{24}$/);
    expect(plan.artifacts.map(artifact => artifact.target)).toEqual(['firmware', 'ble']);
    expect(plan.epochs).toEqual([
      {
        epochId: 'component-install',
        kind: 'component-install',
        artifactIds: [classicFirmwareV4.artifactId, ble.artifact.artifactId],
        dependsOn: [],
        targetIds: ['firmware', 'ble'],
      },
      {
        epochId: 'final-verify',
        kind: 'final-verify',
        artifactIds: [],
        dependsOn: ['component-install'],
        targetIds: ['firmware', 'ble'],
      },
    ]);
    expect(plan.expectedFinalStates.map(state => state.target)).toEqual(['firmware', 'ble']);
    expect(plan.planDigest).toBe(computeFirmwareUpdatePlanDigest(plan));
  });

  it('selects a reviewed universal BLE release for a Bitcoin-only device', () => {
    const ble = createBleFixture();
    const plan = buildFirmwareUpdatePlan({
      ...classicInput,
      deviceSnapshot: {
        ...classicInput.deviceSnapshot,
        firmwareType: 'bitcoinonly',
      },
      manifestSnapshot: ble.snapshot,
    });

    expect(plan.device.firmwareType).toBe('bitcoinonly');
    expect(plan.artifacts.map(artifact => artifact.target)).toEqual(['ble']);
  });

  it('combines Bitcoin-only firmware with a reviewed universal BLE release', () => {
    const firmwareSnapshot = createManifestSnapshot({
      artifacts: [classicFirmwareV4],
      releases: [
        {
          ...classicStableV4,
          releaseId: 'classic1s-bitcoinonly-stable-4.0.0',
          firmwareType: 'bitcoinonly',
        },
      ],
    });
    const ble = createBleFixture();
    const plan = buildFirmwareUpdatePlanBundle({
      ...classicInput,
      deviceSnapshot: {
        ...classicInput.deviceSnapshot,
        firmwareType: 'bitcoinonly',
      },
      manifestSnapshots: [firmwareSnapshot, ble.snapshot],
    });

    expect(plan.device.firmwareType).toBe('bitcoinonly');
    expect(plan.artifacts.map(artifact => artifact.target)).toEqual(['firmware', 'ble']);
    expectPlanError(() =>
      buildFirmwareUpdatePlan({
        ...classicInput,
        deviceSnapshot: {
          ...classicInput.deviceSnapshot,
          firmwareType: 'bitcoinonly',
        },
        manifestSnapshot: createManifestSnapshot(),
      })
    );
  });

  it('keeps one manifest identical to the existing plan API', () => {
    const manifestSnapshot = createManifestSnapshot();

    expect(
      buildFirmwareUpdatePlanBundle({
        ...classicInput,
        manifestSnapshots: [manifestSnapshot],
      })
    ).toEqual(
      buildFirmwareUpdatePlan({
        ...classicInput,
        manifestSnapshot,
      })
    );
  });

  it('orders a bootloader release before its bundled BLE release', () => {
    const bootloader = {
      artifactId: 'classic1s-bootloader-2.9.0',
      role: 'bootloader' as const,
      sourceUrls: ['https://firmware.example.com/classic1s/bootloader-2.9.0.bin'],
      expectedSize: 2048,
      expectedSha256: 'd'.repeat(64),
      integrity: 'signed-manifest' as const,
      container: { kind: 'raw' as const },
      target: 'bootloader' as const,
      targetVersion: '2.9.0',
      devicePathRule: { kind: 'none' as const },
      dependsOn: [],
    };
    const bootloaderSnapshot = createManifestSnapshot({
      artifacts: [bootloader],
      releases: [
        {
          releaseId: 'classic1s-universal-stable-2.9.0-bootloader',
          deviceModel: 'classic1s',
          firmwareType: 'universal',
          channel: 'stable',
          version: '2.9.0',
          required: false,
          artifactIds: [bootloader.artifactId],
        },
      ],
    });
    const ble = createBleFixture();
    const plan = buildFirmwareUpdatePlanBundle({
      ...classicInput,
      deviceSnapshot: {
        ...classicInput.deviceSnapshot,
        currentVersions: {
          ...classicInput.deviceSnapshot.currentVersions,
          firmware: '2.0.0',
        },
      },
      manifestSnapshots: [bootloaderSnapshot, ble.snapshot],
    });

    expect(plan.epochs.map(epoch => epoch.kind)).toEqual([
      'bootloader-install',
      'bootloader-verify',
      'component-install',
      'final-verify',
    ]);
    expect(plan.epochs[2]).toMatchObject({
      artifactIds: [ble.artifact.artifactId],
      dependsOn: ['bootloader-verify'],
      targetIds: ['ble'],
    });
    expect(plan.expectedFinalStates.map(state => state.target)).toEqual(['bootloader', 'ble']);
  });

  it('rejects duplicate families, artifact identities, epochs, and channels', () => {
    const firmwareSnapshot = createManifestSnapshot();
    expectPlanError(() =>
      buildFirmwareUpdatePlanBundle({
        ...classicInput,
        manifestSnapshots: [firmwareSnapshot, firmwareSnapshot],
      })
    );

    const sharedArtifactId = 'shared-artifact';
    const sharedFirmware = { ...classicFirmwareV4, artifactId: sharedArtifactId };
    const sharedBle = createBleFixture({ artifactId: sharedArtifactId });
    expectPlanError(() =>
      buildFirmwareUpdatePlanBundle({
        ...classicInput,
        manifestSnapshots: [
          createManifestSnapshot({
            artifacts: [sharedFirmware],
            releases: [
              {
                ...classicStableV4,
                artifactIds: [sharedArtifactId],
              },
            ],
          }),
          sharedBle.snapshot,
        ],
      })
    );

    expectPlanError(() =>
      buildFirmwareUpdatePlanBundle({
        ...classicInput,
        manifestSnapshots: [firmwareSnapshot, createBleFixture({ catalogEpoch: 13 }).snapshot],
      })
    );
    expectPlanError(() =>
      buildFirmwareUpdatePlanBundle({
        ...classicInput,
        manifestSnapshots: [
          firmwareSnapshot,
          createBleFixture({ channel: 'pre-release' }).snapshot,
        ],
      })
    );
  });

  it('rejects a Pro2 bundle that adds an unsupported BLE family', () => {
    const artifacts = PRO2_TARGETS.map(createPro2Artifact);
    const pro2Snapshot = createManifestSnapshot({
      artifacts,
      releases: [
        {
          releaseId: 'pro2-universal-stable-1.0.0',
          deviceModel: 'pro2',
          firmwareType: 'universal',
          channel: 'stable',
          version: '1.0.0',
          required: false,
          artifactIds: artifacts.map(artifact => artifact.artifactId),
        },
      ],
    });

    expectPlanError(() =>
      buildFirmwareUpdatePlanBundle({
        manifestSnapshots: [pro2Snapshot, createBleFixture({ model: 'pro2' }).snapshot],
        manifestMode: 'external-only',
        deviceSnapshot: {
          identity: 'pro2-device-identity',
          model: 'pro2',
          firmwareType: 'universal',
          currentVersions: {},
        },
        channel: 'stable',
      })
    );
  });
});
