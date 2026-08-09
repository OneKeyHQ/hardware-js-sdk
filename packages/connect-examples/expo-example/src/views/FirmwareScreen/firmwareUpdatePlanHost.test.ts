import { sha256 } from '@noble/hashes/sha256';
import JSZip from 'jszip';
import { prepareFirmwareUpdateV4MemoryHost } from '@onekeyfe/hd-core';
import { EFirmwareType } from '@onekeyfe/hd-shared';

import { prepareFirmwareUpdatePlanMemoryHost } from './firmwareUpdatePlanHost';

import type { CoreApi, FirmwareUpdatePlan } from '@onekeyfe/hd-core';

jest.mock('@onekeyfe/hd-core', () => ({
  prepareFirmwareUpdateV4MemoryHost: jest.fn(() => ({ release: jest.fn() })),
}));

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

const createResourcePlan = (binary: ArrayBuffer): FirmwareUpdatePlan => ({
  schemaVersion: 2,
  planDigest: 'a'.repeat(64),
  executor: 'v4',
  deviceIdentity: 'device-id',
  deviceModel: 'pro2',
  firmwareType: EFirmwareType.Universal,
  platform: 'native',
  targetsToUpdate: ['resource'],
  artifacts: [
    {
      artifactId: 'resource:archive',
      role: 'resourceBundle',
      target: 'resource',
      url: 'https://example.com/resources.zip',
      container: 'zip',
      expectedSize: binary.byteLength,
      expectedSha256: bytesToHex(sha256(new Uint8Array(binary))),
    },
  ],
});

describe('prepareFirmwareUpdatePlanMemoryHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('materializes a local resource ZIP through the Plan host', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', '{"schemaVersion":1}');
    zip.file('bundles/images/images.okpkg', new Uint8Array([1, 2, 3]));
    const binary = await zip.generateAsync({ type: 'arraybuffer' });
    const plan = createResourcePlan(binary);
    const fetcher = jest.fn(() => Promise.reject(new Error('must not fetch')));

    await prepareFirmwareUpdatePlanMemoryHost({
      hardwareSDK: {} as CoreApi,
      plan,
      overrides: { resource: binary },
      fetcher,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(prepareFirmwareUpdateV4MemoryHost).toHaveBeenCalledWith({
      sdk: {},
      plan,
      artifacts: [
        expect.objectContaining({
          artifactId: 'resource:archive',
          binary,
          materializedEntries: expect.arrayContaining([
            expect.objectContaining({ entryName: 'manifest.json' }),
            expect.objectContaining({ entryName: 'bundles/images/images.okpkg' }),
          ]),
        }),
      ],
    });
  });

  test('rejects a local artifact that does not match the Plan receipt', async () => {
    const expected = new Uint8Array([1, 2, 3]).buffer;
    const selected = new Uint8Array([4, 5, 6]).buffer;

    await expect(
      prepareFirmwareUpdatePlanMemoryHost({
        hardwareSDK: {} as CoreApi,
        plan: createResourcePlan(expected),
        overrides: { resource: selected },
      })
    ).rejects.toThrow('Firmware artifact SHA-256 mismatch: resource:archive');
  });

  test('rejects an oversized ZIP entry before allocating its contents', async () => {
    const binary = new Uint8Array([1]).buffer;
    const extractEntry = jest.fn();
    jest.spyOn(JSZip, 'loadAsync').mockResolvedValueOnce({
      files: {
        'oversized.okpkg': {
          name: 'oversized.okpkg',
          unsafeOriginalName: 'oversized.okpkg',
          dir: false,
          _data: {
            compressedSize: 1,
            uncompressedSize: 256 * 1024 * 1024 + 1,
          },
          async: extractEntry,
        },
      },
    } as never);

    await expect(
      prepareFirmwareUpdatePlanMemoryHost({
        hardwareSDK: {} as CoreApi,
        plan: createResourcePlan(binary),
        overrides: { resource: binary },
      })
    ).rejects.toThrow('Firmware ZIP declared size exceeds the allowed limit');
    expect(extractEntry).not.toHaveBeenCalled();
  });
});
