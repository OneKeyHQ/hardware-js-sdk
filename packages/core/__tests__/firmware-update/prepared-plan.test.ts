import {
  FirmwareUpdateErrorCode,
  buildFirmwareUpdatePlan,
  prepareFirmwareUpdate,
  validatePreparedPlan,
} from '../../src/firmware-update';
import {
  classicFirmwareV4,
  classicStableV4,
  createManifestSnapshot,
} from './manifest-plan-fixtures';

import type {
  FirmwareArtifactReceipt,
  FirmwareArtifactRequirement,
} from '../../src/firmware-update';

const createPlan = () =>
  buildFirmwareUpdatePlan({
    manifestSnapshot: createManifestSnapshot(),
    manifestMode: 'external-only',
    deviceSnapshot: {
      identity: 'prepared-device-identity',
      model: 'classic1s',
      firmwareType: 'universal',
      currentVersions: {
        firmware: '3.0.0',
      },
    },
    channel: 'stable',
  });

const createReceipt = (
  overrides: Partial<FirmwareArtifactReceipt> = {}
): FirmwareArtifactReceipt => ({
  artifactId: classicFirmwareV4.artifactId,
  role: classicFirmwareV4.role,
  target: classicFirmwareV4.target,
  artifactRef: 'artifact-ref-classic1s-v4',
  size: classicFirmwareV4.expectedSize as number,
  sha256: classicFirmwareV4.expectedSha256 as string,
  integrity: classicFirmwareV4.integrity,
  leaseId: 'lease-classic1s-v4',
  materialization: { kind: 'raw' },
  ...overrides,
});

const expectFirmwareError = (callback: () => unknown, errorCode: number) => {
  try {
    callback();
    throw new Error('Expected prepared plan validation to fail');
  } catch (error) {
    expect(error).toMatchObject({ errorCode });
  }
};

describe('prepared firmware plans', () => {
  it('binds validated receipts into an immutable network-forbidden plan', () => {
    const plan = createPlan();
    const preparedPlan = prepareFirmwareUpdate({
      plan,
      artifactReceipts: [createReceipt()],
    });

    expect(preparedPlan.planDigest).toBe(plan.planDigest);
    expect(preparedPlan.networkPolicy).toBe('forbid');
    expect(preparedPlan.artifactReceipts).toHaveLength(1);
    expect(Object.isFrozen(preparedPlan)).toBe(true);
    expect(Object.isFrozen(preparedPlan.artifactReceipts)).toBe(true);
    expect(Object.isFrozen(preparedPlan.artifactReceipts[0])).toBe(true);
    expect(JSON.stringify(preparedPlan)).not.toContain('https://');
    expect(validatePreparedPlan(preparedPlan)).toBe(preparedPlan);
  });

  it.each([
    {
      name: 'missing receipt',
      receipts: [],
    },
    {
      name: 'wrong size',
      receipts: [createReceipt({ size: 1 })],
    },
    {
      name: 'wrong digest',
      receipts: [createReceipt({ sha256: 'f'.repeat(64) })],
    },
    {
      name: 'changed integrity label',
      receipts: [createReceipt({ integrity: 'signed-manifest' })],
    },
    {
      name: 'wrong materialization',
      receipts: [
        createReceipt({
          materialization: {
            kind: 'archive-entry',
            parentArtifactId: 'archive-parent',
            entryId: 'firmware-entry',
          },
        }),
      ],
    },
    {
      name: 'empty lease',
      receipts: [createReceipt({ leaseId: '' })],
    },
    {
      name: 'URL artifact ref',
      receipts: [createReceipt({ artifactRef: 'https://firmware.example.com/file.bin' })],
    },
  ])('rejects $name', ({ receipts }) => {
    expectFirmwareError(
      () =>
        prepareFirmwareUpdate({
          plan: createPlan(),
          artifactReceipts: receipts,
        }),
      FirmwareUpdateErrorCode.FirmwareArtifactReceiptMismatch
    );
  });

  it('binds computed receipt integrity for sdk-managed legacy artifacts', () => {
    const legacyArtifact = {
      ...classicFirmwareV4,
      integrity: 'legacy-unverified',
    } as FirmwareArtifactRequirement;
    delete legacyArtifact.expectedSize;
    delete legacyArtifact.expectedSha256;
    const plan = buildFirmwareUpdatePlan({
      manifestSnapshot: createManifestSnapshot({
        artifacts: [legacyArtifact],
        releases: [classicStableV4],
        source: 'sdk-managed-remote',
      }),
      manifestMode: 'sdk-managed',
      deviceSnapshot: {
        identity: 'legacy-device-identity',
        model: 'classic1s',
        firmwareType: 'universal',
        currentVersions: {},
      },
      channel: 'stable',
    });
    const computedReceipt = createReceipt({
      size: 8192,
      sha256: 'a'.repeat(64),
      integrity: 'legacy-unverified',
    });

    const preparedPlan = prepareFirmwareUpdate({
      plan,
      artifactReceipts: [computedReceipt],
    });

    expect(preparedPlan.artifactReceipts[0]).toMatchObject({
      size: 8192,
      sha256: 'a'.repeat(64),
      integrity: 'legacy-unverified',
    });
  });

  it('rejects a prepared epoch dependency cycle', () => {
    const preparedPlan = prepareFirmwareUpdate({
      plan: createPlan(),
      artifactReceipts: [createReceipt()],
    });
    const invalidPreparedPlan = {
      ...preparedPlan,
      epochs: preparedPlan.epochs.map(epoch =>
        epoch.epochId === 'component-install'
          ? {
              ...epoch,
              dependsOn: ['final-verify'],
            }
          : epoch
      ),
    };

    expectFirmwareError(
      () => validatePreparedPlan(invalidPreparedPlan),
      FirmwareUpdateErrorCode.FirmwareArtifactReceiptMismatch
    );
  });
});
