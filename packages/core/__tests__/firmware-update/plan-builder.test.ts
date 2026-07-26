import {
  FirmwareUpdateErrorCode,
  buildFirmwareUpdatePlan,
  canonicalFirmwareJsonBytes,
  canonicalizeFirmwareJson,
  computeFirmwareManifestSnapshotDigest,
  computeFirmwareUpdatePlanDigest,
  sha256CanonicalFirmwareJson,
  validateFirmwareUpdatePlan,
} from '../../src/firmware-update';
import canonicalGolden from './fixtures/canonical-manifest-plan-v2.json';
import {
  PRO2_TARGETS,
  classicFirmwareV4,
  classicStableV4,
  createManifestSnapshot,
  createPro2Artifact,
} from './manifest-plan-fixtures';

const expectFirmwareError = (callback: () => unknown, errorCode: number) => {
  try {
    callback();
    throw new Error('Expected firmware plan validation to fail');
  } catch (error) {
    expect(error).toMatchObject({ errorCode });
  }
};

describe('firmware canonical encoding', () => {
  it('produces identical bytes and digest regardless of object key insertion order', () => {
    const left = {
      z: [3, { beta: true, alpha: 'firmware' }],
      a: {
        version: '4.0.0',
        size: 4096,
      },
    };
    const right = {
      a: {
        size: 4096,
        version: '4.0.0',
      },
      z: [3, { alpha: 'firmware', beta: true }],
    };
    const expectedCanonical =
      '{"a":{"size":4096,"version":"4.0.0"},"z":[3,{"alpha":"firmware","beta":true}]}';

    expect(canonicalizeFirmwareJson(left)).toBe(expectedCanonical);
    expect(canonicalizeFirmwareJson(right)).toBe(expectedCanonical);
    expect(canonicalFirmwareJsonBytes(left)).toEqual(canonicalFirmwareJsonBytes(right));
    expect(sha256CanonicalFirmwareJson(left)).toBe(sha256CanonicalFirmwareJson(right));
    expect(sha256CanonicalFirmwareJson(left)).toBe(
      '3a2d53f36cdc769973ca8d7a782ad3926dcab458e884af478da2d4b06d7937e3'
    );
  });

  it('matches the cross-repository canonical Manifest and Plan golden vector', () => {
    expect(canonicalizeFirmwareJson(canonicalGolden.manifestDigestInput)).toBe(
      canonicalGolden.manifestCanonical
    );
    expect(computeFirmwareManifestSnapshotDigest(canonicalGolden.manifestDigestInput)).toBe(
      canonicalGolden.manifestDigest
    );
    expect(canonicalizeFirmwareJson(canonicalGolden.planDigestInput)).toBe(
      canonicalGolden.planCanonical
    );
    expect(computeFirmwareUpdatePlanDigest(canonicalGolden.planDigestInput)).toBe(
      canonicalGolden.planDigest
    );
  });
});

describe('firmware update plan builder', () => {
  it('selects the latest release by device snapshot, firmware type, and channel', () => {
    const plan = buildFirmwareUpdatePlan({
      manifestSnapshot: createManifestSnapshot(),
      manifestMode: 'external-only',
      deviceSnapshot: {
        identity: 'device-identity-1',
        model: 'classic1s',
        firmwareType: 'universal',
        currentVersions: {
          firmware: '2.0.0',
        },
      },
      channel: 'stable',
    });

    expect(plan.planId).toBe(classicStableV4.releaseId);
    expect(plan.artifacts).toEqual([classicFirmwareV4]);
    expect(plan.expectedFinalStates).toEqual([
      {
        target: 'firmware',
        version: '4.0.0',
        sha256: classicFirmwareV4.expectedSha256,
      },
    ]);
    expect(plan.planDigest).toBe(computeFirmwareUpdatePlanDigest(plan));
    expect(validateFirmwareUpdatePlan(plan)).toBe(plan);
  });

  it('selects BLE releases against the device BLE version instead of its firmware version', () => {
    const bleArtifact = {
      artifactId: 'classic1s-ble-2.1.0',
      role: 'ble' as const,
      sourceUrls: ['https://firmware.example.com/classic1s/ble-2.1.0.bin'],
      expectedSize: 1024,
      expectedSha256: 'b'.repeat(64),
      integrity: 'signed-manifest' as const,
      container: { kind: 'raw' as const },
      target: 'ble' as const,
      targetVersion: '2.1.0',
      devicePathRule: { kind: 'none' as const },
      dependsOn: [],
    };
    const bleRelease = {
      releaseId: 'classic1s-universal-stable-2.1.0-ble',
      deviceModel: 'classic1s',
      firmwareType: 'universal',
      channel: 'stable',
      version: '2.1.0',
      required: false,
      artifactIds: [bleArtifact.artifactId],
    } as const;

    const plan = buildFirmwareUpdatePlan({
      manifestSnapshot: createManifestSnapshot({
        artifacts: [bleArtifact],
        releases: [bleRelease],
      }),
      manifestMode: 'external-only',
      deviceSnapshot: {
        identity: 'device-identity-1',
        model: 'classic1s',
        firmwareType: 'universal',
        currentVersions: {
          firmware: '4.0.0',
          ble: '2.0.0',
        },
      },
      channel: 'stable',
    });

    expect(plan.planId).toBe(bleRelease.releaseId);
    expect(plan.expectedFinalStates).toEqual([
      {
        target: 'ble',
        version: '2.1.0',
        sha256: bleArtifact.expectedSha256,
      },
    ]);
  });

  it('rejects App-selected components or install order at the PlanBuilder boundary', () => {
    const baseInput = {
      manifestSnapshot: createManifestSnapshot(),
      manifestMode: 'external-only',
      deviceSnapshot: {
        identity: 'device-identity-1',
        model: 'classic1s',
        firmwareType: 'universal',
        currentVersions: {
          firmware: '2.0.0',
        },
      },
      channel: 'stable',
    } as const;

    expectFirmwareError(
      () =>
        buildFirmwareUpdatePlan({
          ...baseInput,
          selectedArtifactIds: [classicFirmwareV4.artifactId],
        } as Parameters<typeof buildFirmwareUpdatePlan>[0]),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
    expectFirmwareError(
      () =>
        buildFirmwareUpdatePlan({
          ...baseInput,
          installOrder: [classicFirmwareV4.artifactId],
        } as Parameters<typeof buildFirmwareUpdatePlan>[0]),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
  });

  it('compiles Pro2 targets and dependencies from the SDK-owned table', () => {
    const pro2Artifacts = PRO2_TARGETS.map(target => ({
      ...createPro2Artifact(target),
      dependsOn: target === 'p1' ? ['pro2-se04-1.0.0'] : [],
    }));
    const resourceBundles = [
      'images',
      'animation',
      'wallpaper',
      'translations',
      'fonts_roobert',
      'fonts_noto',
    ].map((logicalName, index) => ({
      artifactId: `pro2-resource-${logicalName}-1.0.0`,
      role: 'resource-bundle' as const,
      sourceUrls: [`https://pro2-firmware.example.com/resources/${logicalName}/1.0.0.okpkg`],
      expectedSize: 8192,
      expectedSha256: String(index + 1).repeat(64),
      integrity: 'signed-manifest' as const,
      container: { kind: 'raw' as const },
      target: 'resource' as const,
      devicePathRule: { kind: 'sdk-generated' as const, logicalName },
      dependsOn: [],
    }));
    const pro2Release = {
      releaseId: 'pro2-universal-stable-1.0.0',
      deviceModel: 'pro2',
      firmwareType: 'universal',
      channel: 'stable',
      version: '1.0.0',
      required: false,
      artifactIds: [...resourceBundles, ...pro2Artifacts].reverse().map(item => item.artifactId),
    } as const;
    const plan = buildFirmwareUpdatePlan({
      manifestSnapshot: createManifestSnapshot({
        artifacts: [...resourceBundles, ...pro2Artifacts].reverse(),
        releases: [pro2Release],
      }),
      manifestMode: 'external-only',
      deviceSnapshot: {
        identity: 'pro2-device-identity',
        model: 'pro2',
        firmwareType: 'universal',
        currentVersions: {},
      },
      channel: 'stable',
    });

    expect(plan.artifacts.map(item => item.target)).toEqual([
      ...PRO2_TARGETS,
      ...resourceBundles.map(() => 'resource'),
    ]);
    expect(plan.epochs.map(item => item.kind)).toEqual([
      'resource-sync',
      'bootloader-install',
      'bootloader-verify',
      'component-install',
      'final-verify',
    ]);
    expect(plan.epochs[3]?.targetIds).toEqual(PRO2_TARGETS.slice(1));
    expect(plan.artifacts[0]?.dependsOn).toEqual([]);
    expect(plan.artifacts.slice(1, PRO2_TARGETS.length).map(item => item.dependsOn)).toEqual(
      PRO2_TARGETS.slice(1).map(() => ['pro2-bootloader-1.0.0'])
    );
    expect(
      plan.artifacts.slice(PRO2_TARGETS.length).every(item => item.dependsOn.length === 0)
    ).toBe(true);
    expect(
      plan.epochs[0]?.artifactIds.every(artifactId => artifactId.startsWith('pro2-resource-'))
    ).toBe(true);
  });

  it('compiles a Pro2 component plan without optional resource bundles', () => {
    const artifacts = PRO2_TARGETS.map(createPro2Artifact);
    const release = {
      releaseId: 'pro2-universal-stable-1.0.0-no-resources',
      deviceModel: 'pro2',
      firmwareType: 'universal',
      channel: 'stable' as const,
      version: '1.0.0',
      required: false,
      artifactIds: artifacts.map(artifact => artifact.artifactId),
    };
    const plan = buildFirmwareUpdatePlan({
      manifestSnapshot: createManifestSnapshot({
        artifacts,
        releases: [release],
      }),
      manifestMode: 'external-only',
      deviceSnapshot: {
        identity: 'pro2-device-identity',
        model: 'pro2',
        firmwareType: 'universal',
        currentVersions: {},
      },
      channel: 'stable',
    });

    expect(plan.artifacts.map(artifact => artifact.target)).toEqual(PRO2_TARGETS);
    expect(plan.epochs.map(epoch => epoch.kind)).toEqual([
      'bootloader-install',
      'bootloader-verify',
      'component-install',
      'final-verify',
    ]);
  });

  it('rejects a Pro2 release that omits a required SDK-owned target', () => {
    const incompleteArtifacts = PRO2_TARGETS.slice(0, -1).map(createPro2Artifact);
    const release = {
      releaseId: 'pro2-universal-stable-incomplete',
      deviceModel: 'pro2',
      firmwareType: 'universal',
      channel: 'stable',
      version: '1.0.0',
      required: false,
      artifactIds: incompleteArtifacts.map(item => item.artifactId),
    } as const;

    expectFirmwareError(
      () =>
        buildFirmwareUpdatePlan({
          manifestSnapshot: createManifestSnapshot({
            artifacts: incompleteArtifacts,
            releases: [release],
          }),
          manifestMode: 'external-only',
          deviceSnapshot: {
            identity: 'pro2-device-identity',
            model: 'pro2',
            firmwareType: 'universal',
            currentVersions: {},
          },
          channel: 'stable',
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
  });

  it('rejects a Pro2 release that omits a required SDK-owned resource bundle', () => {
    const componentArtifacts = PRO2_TARGETS.map(createPro2Artifact);
    const resourceArtifacts = [
      'images',
      'animation',
      'wallpaper',
      'translations',
      'fonts_roobert',
    ].map((logicalName, index) => ({
      artifactId: `pro2-resource-${logicalName}-1.0.0`,
      role: 'resource-bundle' as const,
      sourceUrls: [`https://pro2-firmware.example.com/resources/${logicalName}/1.0.0.okpkg`],
      expectedSize: 8192,
      expectedSha256: String(index + 1).repeat(64),
      integrity: 'signed-manifest' as const,
      container: { kind: 'raw' as const },
      target: 'resource' as const,
      devicePathRule: { kind: 'sdk-generated' as const, logicalName },
      dependsOn: [],
    }));
    const incompleteArtifacts = [...componentArtifacts, ...resourceArtifacts];
    const release = {
      releaseId: 'pro2-universal-stable-incomplete-resource',
      deviceModel: 'pro2',
      firmwareType: 'universal',
      channel: 'stable',
      version: '1.0.0',
      required: false,
      artifactIds: incompleteArtifacts.map(item => item.artifactId),
    } as const;

    expectFirmwareError(
      () =>
        buildFirmwareUpdatePlan({
          manifestSnapshot: createManifestSnapshot({
            artifacts: incompleteArtifacts,
            releases: [release],
          }),
          manifestMode: 'external-only',
          deviceSnapshot: {
            identity: 'pro2-device-identity',
            model: 'pro2',
            firmwareType: 'universal',
            currentVersions: {},
          },
          channel: 'stable',
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
  });

  it('deep-freezes the plan and detects mutation through digest revalidation', () => {
    const plan = buildFirmwareUpdatePlan({
      manifestSnapshot: createManifestSnapshot(),
      manifestMode: 'external-only',
      deviceSnapshot: {
        identity: 'device-identity-1',
        model: 'classic1s',
        firmwareType: 'universal',
        currentVersions: {},
      },
      channel: 'stable',
    });

    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.artifacts)).toBe(true);
    expect(Object.isFrozen(plan.artifacts[0])).toBe(true);
    const mutatedPlan = {
      ...plan,
      expectedFinalStates: [
        {
          ...plan.expectedFinalStates[0],
          version: '99.0.0',
        },
      ],
    };

    expectFirmwareError(
      () => validateFirmwareUpdatePlan(mutatedPlan),
      FirmwareUpdateErrorCode.FirmwarePlanDigestMismatch
    );
  });

  it('rejects relationship mutations even when the caller recomputes the digest', () => {
    const plan = buildFirmwareUpdatePlan({
      manifestSnapshot: createManifestSnapshot(),
      manifestMode: 'external-only',
      deviceSnapshot: {
        identity: 'device-identity-1',
        model: 'classic1s',
        firmwareType: 'universal',
        currentVersions: {},
      },
      channel: 'stable',
    });
    const invalidPlanWithoutDigest = {
      ...plan,
      epochs: plan.epochs.map(epoch =>
        epoch.epochId === 'component-install'
          ? {
              ...epoch,
              dependsOn: ['final-verify'],
            }
          : epoch
      ),
    };
    const invalidPlan = {
      ...invalidPlanWithoutDigest,
      planDigest: computeFirmwareUpdatePlanDigest(invalidPlanWithoutDigest),
    };

    expectFirmwareError(
      () => validateFirmwareUpdatePlan(invalidPlan),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
  });
});
