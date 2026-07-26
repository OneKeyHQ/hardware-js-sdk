import {
  FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY,
  FirmwareUpdateErrorCode,
  compileFirmwareArchiveReceiptExpansions,
  computeFirmwareUpdatePlanDigest,
  createFirmwareArchiveEntryArtifactId,
  prepareFirmwareUpdate,
  resolveFirmwareArtifactDevicePath,
} from '../../src/firmware-update';

import type {
  FirmwareArtifactReceipt,
  FirmwareArtifactRequirement,
  FirmwareUpdatePlan,
} from '../../src/firmware-update';

const PARENT_DIGEST = 'a'.repeat(64);
const ENTRY_ONE_DIGEST = 'b'.repeat(64);
const ENTRY_TWO_DIGEST = 'c'.repeat(64);
const LEASE_ID = 'lease-resource-archive';

const parent: FirmwareArtifactRequirement = {
  artifactId: 'resource-archive',
  role: 'resource-bundle',
  sourceUrls: ['https://firmware.example.com/resource.zip'],
  expectedSize: 32,
  expectedSha256: PARENT_DIGEST,
  integrity: 'catalog-trusted',
  container: {
    kind: 'archive',
    format: 'zip',
    materializationPolicy: FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY,
  },
  target: 'resource',
  devicePathRule: { kind: 'none' },
  dependsOn: [],
};

const createPlan = (): FirmwareUpdatePlan => {
  const planWithoutDigest = {
    schemaVersion: 2 as const,
    planId: 'archive-plan',
    manifestSnapshotDigest: 'd'.repeat(64),
    manifestMode: 'external-only' as const,
    catalogEpoch: 1,
    device: {
      identity: 'device-1',
      model: 'pro',
      firmwareType: 'universal',
    },
    artifacts: [parent],
    epochs: [
      {
        epochId: 'resource-sync',
        kind: 'resource-sync' as const,
        artifactIds: [parent.artifactId],
        dependsOn: [],
        targetIds: ['resource' as const],
      },
      {
        epochId: 'final-verify',
        kind: 'final-verify' as const,
        artifactIds: [],
        dependsOn: ['resource-sync'],
        targetIds: ['resource' as const],
      },
    ],
    expectedFinalStates: [
      {
        target: 'resource' as const,
        sha256: PARENT_DIGEST,
      },
    ],
  };
  return {
    ...planWithoutDigest,
    planDigest: computeFirmwareUpdatePlanDigest(planWithoutDigest),
  };
};

const parentReceipt: FirmwareArtifactReceipt = {
  artifactId: parent.artifactId,
  role: parent.role,
  target: parent.target,
  artifactRef: 'artifact-ref-resource-archive',
  size: parent.expectedSize as number,
  sha256: parent.expectedSha256 as string,
  integrity: parent.integrity,
  leaseId: LEASE_ID,
  materialization: {
    kind: 'archive',
    materializationPolicy: FIRMWARE_V3_RESOURCE_ARCHIVE_POLICY,
  },
};

const createChildReceipt = ({
  entryId,
  sha256,
  size = 4,
  artifactRef,
  leaseId = LEASE_ID,
  logicalName = entryId.split('/').at(-1) ?? '',
}: {
  entryId: string;
  sha256: string;
  size?: number;
  artifactRef: string;
  leaseId?: string;
  logicalName?: string;
}): FirmwareArtifactReceipt => ({
  artifactId: createFirmwareArchiveEntryArtifactId({
    parentArtifactId: parent.artifactId,
    entryId,
    size,
    sha256,
  }),
  role: 'archive-entry',
  target: 'resource',
  logicalName,
  artifactRef,
  size,
  sha256,
  integrity: parent.integrity,
  leaseId,
  materialization: {
    kind: 'archive-entry',
    parentArtifactId: parent.artifactId,
    entryId,
  },
});

const fontReceipt = createChildReceipt({
  entryId: 'resources/fonts/main.bin',
  sha256: ENTRY_ONE_DIGEST,
  artifactRef: 'artifact-ref-resource-font',
});
const imageReceipt = createChildReceipt({
  entryId: 'resources/images/logo.bin',
  sha256: ENTRY_TWO_DIGEST,
  artifactRef: 'artifact-ref-resource-image',
});

const expectReceiptError = (callback: () => unknown) => {
  expect(callback).toThrow(
    expect.objectContaining({
      errorCode: FirmwareUpdateErrorCode.FirmwareArtifactReceiptMismatch,
    })
  );
};

describe('firmware archive plan v2', () => {
  it('compiles deterministic child receipts and expands the parent epoch', () => {
    const plan = createPlan();
    const receipts = [parentReceipt, imageReceipt, fontReceipt];
    const expansions = compileFirmwareArchiveReceiptExpansions(plan, receipts);

    expect(expansions).toHaveLength(1);
    expect(expansions[0]?.parentArtifactId).toBe(parent.artifactId);
    expect(expansions[0]?.childReceipts.map(receipt => receipt.logicalName)).toEqual([
      'logo.bin',
      'main.bin',
    ]);

    const preparedPlan = prepareFirmwareUpdate({
      plan,
      artifactReceipts: receipts,
    });
    expect(preparedPlan.artifactReceipts.map(receipt => receipt.artifactId)).toEqual([
      parent.artifactId,
      imageReceipt.artifactId,
      fontReceipt.artifactId,
    ]);
    expect(preparedPlan.epochs[0]?.artifactIds).toEqual([
      imageReceipt.artifactId,
      fontReceipt.artifactId,
    ]);
    expect(preparedPlan.epochs.flatMap(epoch => epoch.artifactIds)).not.toContain(
      parent.artifactId
    );
    expect(resolveFirmwareArtifactDevicePath(fontReceipt)).toBe('0:res/main.bin');
  });

  it('allows identical child content at different logical paths', () => {
    const sharedArtifactRef = 'artifact-ref-shared-resource-content';
    const first = createChildReceipt({
      entryId: 'resources/wallper.png',
      sha256: ENTRY_ONE_DIGEST,
      artifactRef: sharedArtifactRef,
    });
    const second = createChildReceipt({
      entryId: 'resources/change-wallper.png',
      sha256: ENTRY_ONE_DIGEST,
      artifactRef: sharedArtifactRef,
    });

    expect(first.artifactId).not.toBe(second.artifactId);
    const preparedPlan = prepareFirmwareUpdate({
      plan: createPlan(),
      artifactReceipts: [parentReceipt, first, second],
    });
    expect(
      preparedPlan.artifactReceipts.filter(receipt => receipt.role === 'archive-entry')
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ artifactId: first.artifactId, artifactRef: sharedArtifactRef }),
        expect.objectContaining({ artifactId: second.artifactId, artifactRef: sharedArtifactRef }),
      ])
    );
  });

  it.each([
    {
      name: 'size',
      size: 5,
      sha256: ENTRY_ONE_DIGEST,
    },
    {
      name: 'digest',
      size: 4,
      sha256: ENTRY_TWO_DIGEST,
    },
  ])('rejects a shared child artifactRef with conflicting $name metadata', ({ size, sha256 }) => {
    const sharedArtifactRef = 'artifact-ref-conflicting-resource-content';
    const first = createChildReceipt({
      entryId: 'resources/wallper.png',
      sha256: ENTRY_ONE_DIGEST,
      artifactRef: sharedArtifactRef,
    });
    const second = createChildReceipt({
      entryId: 'resources/change-wallper.png',
      size,
      sha256,
      artifactRef: sharedArtifactRef,
    });

    expectReceiptError(() =>
      prepareFirmwareUpdate({
        plan: createPlan(),
        artifactReceipts: [parentReceipt, first, second],
      })
    );
  });

  it.each([
    '../escape.bin',
    '/absolute.bin',
    'C:/windows.bin',
    String.raw`\\server\share.bin`,
    String.raw`resources\main.bin`,
    'resource.bin:alternate',
    'resource\u0000.bin',
    'CON',
    'folder/trailing.',
    'folder/trailing ',
    '__MACOSX/resource.bin',
    'nested/resource.zip',
  ])('rejects unsafe or excluded dynamic entry %s', entryId => {
    const receipt = createChildReceipt({
      entryId,
      sha256: ENTRY_ONE_DIGEST,
      artifactRef: 'artifact-ref-invalid-entry',
    });
    expectReceiptError(() =>
      prepareFirmwareUpdate({
        plan: createPlan(),
        artifactReceipts: [parentReceipt, receipt],
      })
    );
  });

  it('rejects Unicode and case-fold logical-name collisions', () => {
    const first = createChildReceipt({
      entryId: 'resources/Logo.bin',
      sha256: ENTRY_ONE_DIGEST,
      artifactRef: 'artifact-ref-logo-upper',
    });
    const second = createChildReceipt({
      entryId: 'other/logo.bin',
      sha256: ENTRY_TWO_DIGEST,
      artifactRef: 'artifact-ref-logo-lower',
    });

    expectReceiptError(() =>
      prepareFirmwareUpdate({
        plan: createPlan(),
        artifactReceipts: [parentReceipt, first, second],
      })
    );
  });

  it('rejects full Unicode case-fold collisions', () => {
    const first = createChildReceipt({
      entryId: 'resources/ß.bin',
      sha256: ENTRY_ONE_DIGEST,
      artifactRef: 'artifact-ref-sharp-s',
    });
    const second = createChildReceipt({
      entryId: 'other/ss.bin',
      sha256: ENTRY_TWO_DIGEST,
      artifactRef: 'artifact-ref-double-s',
    });

    expectReceiptError(() =>
      prepareFirmwareUpdate({
        plan: createPlan(),
        artifactReceipts: [parentReceipt, first, second],
      })
    );
  });

  it('enforces the logical-name limit in UTF-8 bytes', () => {
    const accepted = createChildReceipt({
      entryId: `resources/${'é'.repeat(62)}.bin`,
      sha256: ENTRY_ONE_DIGEST,
      artifactRef: 'artifact-ref-utf8-boundary',
    });
    expect(() =>
      prepareFirmwareUpdate({
        plan: createPlan(),
        artifactReceipts: [parentReceipt, accepted],
      })
    ).not.toThrow();

    const rejected = createChildReceipt({
      entryId: `resources/${'é'.repeat(63)}.bin`,
      sha256: ENTRY_ONE_DIGEST,
      artifactRef: 'artifact-ref-utf8-overflow',
    });
    expectReceiptError(() =>
      prepareFirmwareUpdate({
        plan: createPlan(),
        artifactReceipts: [parentReceipt, rejected],
      })
    );
  });

  it.each([
    {
      name: 'wrong lease',
      mutate: () => ({ ...fontReceipt, leaseId: 'other-lease' }),
    },
    {
      name: 'changed child digest without a matching logical id',
      mutate: () => ({ ...fontReceipt, sha256: 'f'.repeat(64) }),
    },
    {
      name: 'changed child size without a matching logical id',
      mutate: () => ({ ...fontReceipt, size: fontReceipt.size + 1 }),
    },
    {
      name: 'changed logical name',
      mutate: () => ({ ...fontReceipt, logicalName: 'other.bin' }),
    },
    {
      name: 'unknown parent',
      mutate: () => ({
        ...fontReceipt,
        materialization: {
          kind: 'archive-entry' as const,
          parentArtifactId: 'other-parent',
          entryId: 'resources/fonts/main.bin',
        },
      }),
    },
  ])('rejects $name', ({ mutate }) => {
    expectReceiptError(() =>
      prepareFirmwareUpdate({
        plan: createPlan(),
        artifactReceipts: [parentReceipt, mutate()],
      })
    );
  });

  it('rejects an archive parent without a complete native materialization result', () => {
    expectReceiptError(() =>
      prepareFirmwareUpdate({
        plan: createPlan(),
        artifactReceipts: [parentReceipt],
      })
    );
  });
});
