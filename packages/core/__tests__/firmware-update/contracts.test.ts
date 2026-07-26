import {
  FIRMWARE_UPDATE_CAPABILITIES,
  FirmwareUpdateErrorCode,
  computeFirmwareManifestSnapshotDigest,
  computeFirmwareUpdatePlanDigest,
  getFirmwareUpdateCapabilities,
  validateFirmwareCheckpoint,
  validateFirmwareManifestSnapshot,
  validateFirmwareUpdatePlan,
  validatePreparedPlan,
} from '../../src/firmware-update';
import { createCoreApi } from '../../src/inject';

const SHA256_A = 'a'.repeat(64);

const artifactRequirement = {
  artifactId: 'firmware-main',
  role: 'firmware',
  sourceUrls: ['https://firmware.example.com/classic-1s-4.0.0.bin'],
  expectedSize: 4096,
  expectedSha256: SHA256_A,
  integrity: 'catalog-trusted',
  container: {
    kind: 'raw',
  },
  target: 'firmware',
  devicePathRule: {
    kind: 'none',
  },
  dependsOn: [],
};

const epoch = {
  epochId: 'epoch-main',
  kind: 'component-install',
  artifactIds: ['firmware-main'],
  dependsOn: [],
  targetIds: ['firmware'],
};

const expectedFinalState = {
  target: 'firmware',
  version: '4.0.0',
  sha256: SHA256_A,
};

const planWithoutDigest = {
  schemaVersion: 2,
  planId: 'plan-classic-1s-4.0.0',
  manifestSnapshotDigest: SHA256_A,
  manifestMode: 'external-only',
  catalogEpoch: 12,
  device: {
    identity: 'device-identity-1',
    model: 'classic1s',
  },
  artifacts: [artifactRequirement],
  epochs: [epoch],
  expectedFinalStates: [expectedFinalState],
};

const plan = {
  ...planWithoutDigest,
  planDigest: computeFirmwareUpdatePlanDigest(planWithoutDigest),
};

const manifestSnapshotWithoutDigest = {
  schemaVersion: 2,
  catalogEpoch: plan.catalogEpoch,
  source: 'app-bundled-catalog',
  sourceProjectionDigest: 'b'.repeat(64),
  artifactCatalog: plan.artifacts,
  releases: [
    {
      releaseId: plan.planId,
      deviceModel: plan.device.model,
      firmwareType: 'universal',
      channel: 'stable',
      version: expectedFinalState.version,
      required: false,
      artifactIds: [artifactRequirement.artifactId],
    },
  ],
};

const manifestSnapshot = {
  ...manifestSnapshotWithoutDigest,
  snapshotDigest: computeFirmwareManifestSnapshotDigest(manifestSnapshotWithoutDigest),
};

const preparedPlan = {
  schemaVersion: 2,
  planId: plan.planId,
  planDigest: plan.planDigest,
  manifestSnapshotDigest: plan.manifestSnapshotDigest,
  catalogEpoch: plan.catalogEpoch,
  networkPolicy: 'forbid',
  device: plan.device,
  artifactReceipts: [
    {
      artifactId: artifactRequirement.artifactId,
      role: artifactRequirement.role,
      target: artifactRequirement.target,
      artifactRef: 'artifact-ref-firmware-main',
      size: artifactRequirement.expectedSize,
      sha256: artifactRequirement.expectedSha256,
      integrity: artifactRequirement.integrity,
      leaseId: 'lease-1',
      materialization: {
        kind: 'raw',
      },
    },
  ],
  epochs: plan.epochs,
  expectedFinalStates: plan.expectedFinalStates,
};

const checkpoint = {
  schemaVersion: 1,
  transactionId: 'transaction-1',
  planDigest: plan.planDigest,
  sequence: 1,
  state: 'PREPARED',
  timestampMs: 1_721_862_400_000,
};

const expectFirmwareError = (callback: () => unknown, errorCode: number) => {
  try {
    callback();
    throw new Error('Expected firmware contract validation to fail');
  } catch (error) {
    expect(error).toMatchObject({ errorCode });
  }
};

describe('firmware update contracts', () => {
  it('accepts the versioned plan and prepared plan schemas', () => {
    expect(validateFirmwareManifestSnapshot(manifestSnapshot)).toEqual(manifestSnapshot);
    expect(validateFirmwareUpdatePlan(plan)).toEqual(plan);
    expect(validatePreparedPlan(preparedPlan)).toEqual(preparedPlan);
    expect(validateFirmwareCheckpoint(checkpoint)).toEqual(checkpoint);
  });

  it('rejects unsupported schema versions and unknown fields', () => {
    expectFirmwareError(
      () =>
        validateFirmwareManifestSnapshot({
          ...manifestSnapshot,
          schemaVersion: 1,
        }),
      FirmwareUpdateErrorCode.FirmwareManifestInvalid
    );
    expectFirmwareError(
      () =>
        validateFirmwareManifestSnapshot({
          ...manifestSnapshot,
          sourceProjectionDigest: 'invalid',
        }),
      FirmwareUpdateErrorCode.FirmwareManifestInvalid
    );
    expectFirmwareError(
      () => validateFirmwareUpdatePlan({ ...plan, schemaVersion: 1 }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
    expectFirmwareError(
      () =>
        validateFirmwareUpdatePlan({
          ...plan,
          appSelectedInstallOrder: ['firmware-main'],
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
    expectFirmwareError(
      () => validatePreparedPlan({ ...preparedPlan, schemaVersion: 1 }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
  });

  it('rejects non-safe integers and duplicate artifact identities', () => {
    expectFirmwareError(
      () =>
        validateFirmwareUpdatePlan({
          ...plan,
          catalogEpoch: Number.MAX_SAFE_INTEGER + 1,
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
    expectFirmwareError(
      () =>
        validateFirmwareUpdatePlan({
          ...plan,
          artifacts: [
            artifactRequirement,
            {
              ...artifactRequirement,
              sourceUrls: ['https://mirror.example.com/duplicate.bin'],
            },
          ],
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
    expectFirmwareError(
      () =>
        validateFirmwareUpdatePlan({
          ...plan,
          artifacts: [
            {
              ...artifactRequirement,
              expectedSize: Number.MAX_SAFE_INTEGER + 1,
            },
          ],
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
    expectFirmwareError(
      () =>
        validateFirmwareCheckpoint({
          ...checkpoint,
          sequence: Number.MAX_SAFE_INTEGER + 1,
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
  });

  it('rejects artifact admission values outside the cross-platform limits', () => {
    for (const artifact of [
      {
        ...artifactRequirement,
        artifactId: 'é'.repeat(129),
      },
      {
        ...artifactRequirement,
        sourceUrls: ['https://firmware.example.com:444/classic-1s-4.0.0.bin'],
      },
      {
        ...artifactRequirement,
        expectedSize: 512 * 1024 * 1024 + 1,
      },
    ]) {
      expectFirmwareError(
        () =>
          validateFirmwareUpdatePlan({
            ...plan,
            artifacts: [artifact],
          }),
        FirmwareUpdateErrorCode.FirmwarePlanInvalid
      );
    }

    expectFirmwareError(
      () =>
        validatePreparedPlan({
          ...preparedPlan,
          artifactReceipts: [
            {
              ...preparedPlan.artifactReceipts[0],
              size: 512 * 1024 * 1024 + 1,
            },
          ],
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );

    expectFirmwareError(
      () =>
        validateFirmwareManifestSnapshot({
          ...manifestSnapshot,
          artifactCatalog: [
            {
              ...artifactRequirement,
              expectedSize: 512 * 1024 * 1024 + 1,
            },
          ],
        }),
      FirmwareUpdateErrorCode.FirmwareManifestIntegrityMissing
    );
  });

  it('allows source URLs only in plans and rejects URL or path leakage after preparation', () => {
    expect(validateFirmwareUpdatePlan(plan).artifacts[0]?.sourceUrls).toEqual(
      artifactRequirement.sourceUrls
    );

    expectFirmwareError(
      () =>
        validatePreparedPlan({
          ...preparedPlan,
          artifactReceipts: [
            {
              ...preparedPlan.artifactReceipts[0],
              url: artifactRequirement.sourceUrls[0],
            },
          ],
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
    expectFirmwareError(
      () =>
        validatePreparedPlan({
          ...preparedPlan,
          artifactReceipts: [
            {
              ...preparedPlan.artifactReceipts[0],
              artifactRef: 'file:///private/firmware/main.bin',
            },
          ],
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
    expectFirmwareError(
      () =>
        validatePreparedPlan({
          ...preparedPlan,
          artifactReceipts: [
            {
              ...preparedPlan.artifactReceipts[0],
              materialization: {
                kind: 'archive-entry',
                parentArtifactId: 'firmware-archive',
                entryId: 'firmware-main',
                path: '/private/firmware/main.bin',
              },
            },
          ],
        }),
      FirmwareUpdateErrorCode.FirmwarePlanInvalid
    );
  });
});

describe('firmware update capabilities', () => {
  it('returns an exact, immutable protocol capability object', () => {
    const capabilities = getFirmwareUpdateCapabilities();

    expect(capabilities).toEqual({
      planSchemaVersion: 2,
      preparedPlanSchemaVersion: 2,
      hostBindingProtocolVersion: 1,
      checkpointSchemaVersion: 1,
      manifestModes: ['external-only', 'sdk-managed'],
      supportsArtifactReader: true,
      supportsAwaitableCheckpoint: true,
      supportsResume: true,
      supportsReconciliation: true,
    });
    expect(capabilities).toBe(FIRMWARE_UPDATE_CAPABILITIES);
    expect(Object.isFrozen(capabilities)).toBe(true);
    expect(Object.isFrozen(capabilities.manifestModes)).toBe(true);
  });

  it('exposes capabilities locally without crossing the RPC boundary', () => {
    const call = jest.fn();
    const api = createCoreApi(call);

    expect(api.getFirmwareUpdateCapabilities()).toBe(FIRMWARE_UPDATE_CAPABILITIES);
    expect(call).not.toHaveBeenCalled();
  });
});
