import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { EFirmwareType } from '@onekeyfe/hd-shared';
import JSZip from 'jszip';

import { readVerifiedPreparedResourceArchive } from '../../src/api/firmware/FirmwarePreparedResourceArchive';
import { prepareFirmwareUpdatePlan } from '../../src/api/firmware/FirmwareUpdatePreparedPlan';
import { digestFirmwareUpdateContract } from '../../src/api/firmware/FirmwareUpdatePlan';

import type {
  FirmwareArtifactReader,
  FirmwareArtifactReference,
} from '../../src/types/api/firmwareUpdate';
import type { FirmwareUpdatePlan } from '../../src/types/api/firmwareUpdatePlan';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createReference = (artifactRef: string, binary: ArrayBuffer): FirmwareArtifactReference => ({
  artifactRef,
  size: binary.byteLength,
  sha256: bytesToHex(sha256(new Uint8Array(binary))),
});

const createReader = (artifacts: Map<string, ArrayBuffer>): FirmwareArtifactReader => {
  const opened = new Map<string, ArrayBuffer>();
  let sequence = 0;
  return {
    open({ artifactRef }) {
      const binary = artifacts.get(artifactRef);
      if (!binary) throw new Error(`missing artifact: ${artifactRef}`);
      sequence += 1;
      const readerId = `reader-${sequence}`;
      opened.set(readerId, binary);
      return Promise.resolve({ readerId, size: binary.byteLength });
    },
    read({ readerId, offset, length }) {
      const binary = opened.get(readerId);
      if (!binary) throw new Error(`missing reader: ${readerId}`);
      const data = binary.slice(offset, offset + length);
      return Promise.resolve({
        data,
        bytesRead: data.byteLength,
        eof: offset + length === binary.byteLength,
      });
    },
    close({ readerId }) {
      opened.delete(readerId);
      return Promise.resolve();
    },
  };
};

const createPreparedResourcePlan = ({
  executor,
  archiveBinary,
  entryBinary,
}: {
  executor: 'v2' | 'v3';
  archiveBinary: ArrayBuffer;
  entryBinary: ArrayBuffer;
}) => {
  const archiveArtifact = createReference('resource-archive', archiveBinary);
  const entryArtifact = createReference('resource-entry', entryBinary);
  const planWithoutDigest: Omit<FirmwareUpdatePlan, 'planDigest'> = {
    schemaVersion: 2,
    executor,
    deviceIdentity: `${executor}-device`,
    deviceModel: executor === 'v2' ? 'TOUCH' : 'PRO',
    firmwareType: EFirmwareType.Universal,
    platform: 'desktop',
    artifacts: [
      {
        artifactId: 'resource',
        role: 'resource',
        target: 'resource',
        url: 'https://firmware.onekey.so/resource.zip',
        container: 'zip',
        expectedSize: archiveArtifact.size,
        expectedSha256: archiveArtifact.sha256,
      },
    ],
    targetsToUpdate: ['resource'],
  };
  const plan: FirmwareUpdatePlan = {
    ...planWithoutDigest,
    planDigest: digestFirmwareUpdateContract(planWithoutDigest),
  };
  return {
    archiveArtifact,
    preparedPlan: prepareFirmwareUpdatePlan({
      plan,
      leaseRef: `${executor}-resource-lease`,
      artifacts: [
        {
          artifactId: 'resource',
          artifact: archiveArtifact,
          materializedEntries: [{ entryName: 'images/logo.bin', artifact: entryArtifact }],
        },
      ],
    }),
  };
};

describe.each(['v2', 'v3'] as const)('%s prepared resource archive binding', executor => {
  test('rejects a missing artifact reader', async () => {
    const entryBinary = Uint8Array.from([1, 2, 3, 4]).buffer;
    const zip = new JSZip();
    zip.file('images/logo.bin', entryBinary);
    const archiveBinary = await zip.generateAsync({ type: 'arraybuffer' });
    const { preparedPlan } = createPreparedResourcePlan({
      executor,
      archiveBinary,
      entryBinary,
    });

    await expect(
      readVerifiedPreparedResourceArchive({
        preparedPlan,
        reader: undefined,
      })
    ).rejects.toMatchObject({
      params: { firmwareUpdateCode: 'FirmwareArtifactReaderInvalid' },
    });
  });

  test('uses canonical bytes extracted from the approved ZIP', async () => {
    const entryBinary = Uint8Array.from([1, 2, 3, 4]).buffer;
    const zip = new JSZip();
    zip.file('images/logo.bin', entryBinary);
    const archiveBinary = await zip.generateAsync({ type: 'arraybuffer' });
    const { archiveArtifact, preparedPlan } = createPreparedResourcePlan({
      executor,
      archiveBinary,
      entryBinary,
    });

    const result = await readVerifiedPreparedResourceArchive({
      preparedPlan,
      reader: createReader(new Map([[archiveArtifact.artifactRef, archiveBinary]])),
    });

    expect(result).toHaveLength(1);
    expect(result[0].entryName).toBe('logo.bin');
    expect(new Uint8Array(result[0].binary)).toEqual(new Uint8Array(entryBinary));
  });

  test('rejects entries that are not derived from the approved ZIP', async () => {
    const approvedEntry = Uint8Array.from([1, 2, 3, 4]).buffer;
    const substitutedEntry = Uint8Array.from([9, 9, 9, 9]).buffer;
    const zip = new JSZip();
    zip.file('images/logo.bin', approvedEntry);
    const archiveBinary = await zip.generateAsync({ type: 'arraybuffer' });
    const { archiveArtifact, preparedPlan } = createPreparedResourcePlan({
      executor,
      archiveBinary,
      entryBinary: substitutedEntry,
    });

    await expect(
      readVerifiedPreparedResourceArchive({
        preparedPlan,
        reader: createReader(new Map([[archiveArtifact.artifactRef, archiveBinary]])),
      })
    ).rejects.toMatchObject({
      params: { firmwareUpdateCode: 'FirmwareArtifactReceiptMismatch' },
    });
  });
});
