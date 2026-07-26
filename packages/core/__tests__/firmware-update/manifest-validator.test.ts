import {
  FirmwareUpdateErrorCode,
  computeFirmwareManifestSnapshotDigest,
  validateFirmwareManifestSnapshot,
} from '../../src/firmware-update';
import {
  classicFirmwareV4,
  classicStableV3,
  classicStableV4,
  createManifestSnapshot,
} from './manifest-plan-fixtures';

import type { FirmwareArtifactRequirement } from '../../src/firmware-update';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const withoutArtifactFields = (
  ...fields: readonly ('expectedSize' | 'expectedSha256')[]
): FirmwareArtifactRequirement => {
  const artifact: Partial<FirmwareArtifactRequirement> = { ...classicFirmwareV4 };
  fields.forEach(field => {
    delete artifact[field];
  });
  return artifact as FirmwareArtifactRequirement;
};

const expectFirmwareError = (callback: () => unknown, errorCode: number) => {
  try {
    callback();
    throw new Error('Expected firmware manifest validation to fail');
  } catch (error) {
    expect(error).toMatchObject({ errorCode });
  }
};

describe('firmware manifest validator', () => {
  it('accepts a digest-bound external manifest snapshot', () => {
    const snapshot = createManifestSnapshot();

    expect(
      validateFirmwareManifestSnapshot(snapshot, {
        manifestMode: 'external-only',
      })
    ).toEqual(snapshot);
    expect(computeFirmwareManifestSnapshotDigest(snapshot)).toBe(snapshot.snapshotDigest);
  });

  it('rejects duplicate versions for the same model, firmware type, and channel', () => {
    const duplicateRelease = {
      ...classicStableV4,
      releaseId: 'classic1s-universal-stable-4.0.0-duplicate',
    };
    const snapshot = createManifestSnapshot({
      releases: [classicStableV3, classicStableV4, duplicateRelease],
    });

    expectFirmwareError(
      () =>
        validateFirmwareManifestSnapshot(snapshot, {
          manifestMode: 'external-only',
        }),
      FirmwareUpdateErrorCode.FirmwareManifestInvalid
    );
  });

  it('rejects missing release components and unknown targets', () => {
    const missingComponentSnapshot = createManifestSnapshot({
      releases: [
        {
          ...classicStableV4,
          artifactIds: ['missing-firmware-component'],
        },
      ],
    });
    expectFirmwareError(
      () => validateFirmwareManifestSnapshot(missingComponentSnapshot),
      FirmwareUpdateErrorCode.FirmwareManifestInvalid
    );

    const unknownTargetSnapshot = createManifestSnapshot({
      artifacts: [
        {
          ...classicFirmwareV4,
          target: 'remote-arbitrary-target',
        } as unknown as FirmwareArtifactRequirement,
      ],
      releases: [classicStableV4],
    });
    expectFirmwareError(
      () => validateFirmwareManifestSnapshot(unknownTargetSnapshot),
      FirmwareUpdateErrorCode.FirmwareManifestInvalid
    );
  });

  it.each([
    {
      name: 'non-HTTPS URL',
      sourceUrls: ['http://firmware.example.com/classic1s/4.0.0.bin'],
    },
    {
      name: 'URL userinfo',
      sourceUrls: ['https://user:password@firmware.example.com/classic1s/4.0.0.bin'],
    },
    {
      name: 'cross-host redirect descriptor',
      sourceUrls: [
        {
          url: 'https://firmware.example.com/classic1s/4.0.0.bin',
          redirectTo: 'https://untrusted.example.net/classic1s/4.0.0.bin',
        },
      ],
    },
  ])('rejects $name', ({ sourceUrls }) => {
    const snapshot = createManifestSnapshot({
      artifacts: [
        {
          ...classicFirmwareV4,
          sourceUrls,
        } as unknown as FirmwareArtifactRequirement,
      ],
      releases: [classicStableV4],
    });

    expectFirmwareError(
      () => validateFirmwareManifestSnapshot(snapshot),
      FirmwareUpdateErrorCode.FirmwareManifestInvalid
    );
  });

  it.each([
    {
      name: 'missing digest',
      artifact: withoutArtifactFields('expectedSha256'),
    },
    {
      name: 'empty digest',
      artifact: {
        ...classicFirmwareV4,
        expectedSha256: '',
      },
    },
    {
      name: 'missing size',
      artifact: withoutArtifactFields('expectedSize'),
    },
    {
      name: 'invalid size',
      artifact: {
        ...classicFirmwareV4,
        expectedSize: 0,
      },
    },
  ])('rejects external-only artifacts with $name', ({ artifact }) => {
    const snapshot = createManifestSnapshot({
      artifacts: [artifact],
      releases: [classicStableV4],
    });

    expectFirmwareError(
      () =>
        validateFirmwareManifestSnapshot(snapshot, {
          manifestMode: 'external-only',
        }),
      FirmwareUpdateErrorCode.FirmwareManifestIntegrityMissing
    );
  });

  it('allows sdk-managed legacy-unverified artifacts to bind integrity after download', () => {
    const legacyArtifact = {
      ...classicFirmwareV4,
      integrity: 'legacy-unverified',
    } as const;
    delete (legacyArtifact as Partial<FirmwareArtifactRequirement>).expectedSize;
    delete (legacyArtifact as Partial<FirmwareArtifactRequirement>).expectedSha256;
    const snapshot = createManifestSnapshot({
      artifacts: [legacyArtifact],
      releases: [classicStableV4],
      source: 'sdk-managed-remote',
    });

    expect(
      validateFirmwareManifestSnapshot(snapshot, {
        manifestMode: 'sdk-managed',
      })
    ).toEqual(snapshot);
  });

  it('rejects legacy-unverified integrity in external-only mode even when hints are present', () => {
    const snapshot = createManifestSnapshot({
      artifacts: [
        {
          ...classicFirmwareV4,
          integrity: 'legacy-unverified',
        },
      ],
      releases: [classicStableV4],
    });

    expectFirmwareError(
      () =>
        validateFirmwareManifestSnapshot(snapshot, {
          manifestMode: 'external-only',
        }),
      FirmwareUpdateErrorCode.FirmwareManifestIntegrityMissing
    );
  });

  it('rejects a snapshot digest that does not bind the canonical payload', () => {
    const snapshot = {
      ...createManifestSnapshot(),
      snapshotDigest: 'f'.repeat(64),
    };

    expectFirmwareError(
      () => validateFirmwareManifestSnapshot(snapshot),
      FirmwareUpdateErrorCode.FirmwareManifestInvalid
    );
  });
});
