import { sha256 } from '@noble/hashes/sha256';
import { EFirmwareType } from '@onekeyfe/hd-shared';

import { loadFirmwareUpdatePlanBinaries } from './firmwareUpdatePlanHost';

import type { FirmwareUpdatePlan } from '@onekeyfe/hd-core';

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

describe('loadFirmwareUpdatePlanBinaries', () => {
  test('maps a local resource ZIP to firmwareUpdateV4 binaries', async () => {
    const binary = new Uint8Array([1, 2, 3, 4]).buffer;
    const plan = createResourcePlan(binary);
    const fetcher = jest.fn(() => Promise.reject(new Error('must not fetch')));

    const binaries = await loadFirmwareUpdatePlanBinaries({
      plan,
      overrides: { resource: binary },
      fetcher,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(binaries).toEqual({
      targetsToUpdate: ['resource'],
      resourceArchiveBinary: binary,
    });
  });

  test('downloads a raw component artifact into the matching binary field', async () => {
    const bootloaderBinary = new Uint8Array([9, 8, 7]).buffer;
    const plan: FirmwareUpdatePlan = {
      schemaVersion: 2,
      planDigest: 'a'.repeat(64),
      executor: 'v4',
      deviceIdentity: 'device-id',
      deviceModel: 'pro2',
      firmwareType: EFirmwareType.Universal,
      platform: 'web',
      targetsToUpdate: ['boot'],
      artifacts: [
        {
          artifactId: 'component:boot',
          role: 'component',
          target: 'boot',
          url: 'https://example.com/boot.okpkg',
          container: 'raw',
          expectedSize: bootloaderBinary.byteLength,
          expectedSha256: bytesToHex(sha256(new Uint8Array(bootloaderBinary))),
        },
      ],
    };
    const fetcher = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(bootloaderBinary),
      })
    );

    const binaries = await loadFirmwareUpdatePlanBinaries({ plan, fetcher });

    expect(fetcher).toHaveBeenCalledWith('https://example.com/boot.okpkg');
    expect(binaries).toEqual({
      targetsToUpdate: ['boot'],
      bootloaderBinary,
    });
  });

  test('rejects a local artifact that does not match the Plan receipt', async () => {
    const expected = new Uint8Array([1, 2, 3]).buffer;
    const selected = new Uint8Array([4, 5, 6]).buffer;

    await expect(
      loadFirmwareUpdatePlanBinaries({
        plan: createResourcePlan(expected),
        overrides: { resource: selected },
      })
    ).rejects.toThrow('Firmware artifact SHA-256 mismatch: resource:archive');
  });
});
