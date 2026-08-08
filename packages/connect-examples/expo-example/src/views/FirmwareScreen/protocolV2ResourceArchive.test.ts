import { sha256 } from '@noble/hashes/sha256';
import JSZip from 'jszip';
import { prepareProtocolV2ResourceFiles } from '@onekeyfe/hd-core';

import { prepareRemoteProtocolV2ResourceFiles } from './protocolV2ResourceArchive';

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

const createResourceArchive = async () => {
  const resources = [
    {
      archivePath: 'bundles/firmware_logo.okpkg',
      originalName: 'firmware_logo.okpkg',
      devicePath: 'vol0:/bundles/firmware_logo.okpkg',
      binary: new Uint8Array([1, 2, 3, 4]),
    },
    {
      archivePath: 'loaders/bootloader/boot_resource.okpkg',
      originalName: 'boot_resource.okpkg',
      devicePath: 'vol0:/loaders/bootloader/boot_resource.okpkg',
      binary: new Uint8Array([5, 6, 7, 8]),
    },
  ];
  const manifest = {
    schema: 1,
    artifact_name: 'protocol-v2-resources',
    release_name: 'test-release',
    variant: 'resource',
    commit: '0123456789abcdef',
    short_sha: '0123456',
    timestamp_utc: '2026-08-08T00:00:00Z',
    core_version: '1.0.0',
    key_set: 'dev_release',
    device_root: 'vol0:',
    restore_mode: 'bootloader_update',
    trees: [],
    files: resources.map(resource => ({
      archive_path: resource.archivePath,
      original_name: resource.originalName,
      device_path: resource.devicePath,
      size: resource.binary.byteLength,
      sha256: bytesToHex(sha256(resource.binary)),
      signed: true,
      sig_algo: 'ed25519',
      payload_version: '1.0.0',
    })),
  };
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest));
  resources.forEach(resource => zip.file(resource.archivePath, resource.binary));
  const binary = await zip.generateAsync({ type: 'arraybuffer' });
  return {
    binary,
    source: {
      archiveUrl: 'https://example.com/protocol-v2-resources.zip',
      archiveSha256: bytesToHex(sha256(new Uint8Array(binary))),
      archiveSize: binary.byteLength,
    },
  };
};

describe('prepareRemoteProtocolV2ResourceFiles', () => {
  test('downloads and verifies a complete resource archive', async () => {
    const { binary, source } = await createResourceArchive();
    const result = await prepareRemoteProtocolV2ResourceFiles({
      hardwareSDK: { prepareProtocolV2ResourceFiles },
      archive: source,
      targetsToUpdate: ['resource'],
      fetcher: jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(binary),
      }),
    });

    expect(result?.map(file => file.devicePath)).toEqual([
      'vol0:/bundles/firmware_logo.okpkg',
      'vol0:/loaders/bootloader/boot_resource.okpkg',
    ]);
  });

  test('rejects an archive hash mismatch', async () => {
    const { binary, source } = await createResourceArchive();

    await expect(
      prepareRemoteProtocolV2ResourceFiles({
        hardwareSDK: { prepareProtocolV2ResourceFiles },
        archive: { ...source, archiveSha256: '0'.repeat(64) },
        targetsToUpdate: ['resource'],
        fetcher: jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          arrayBuffer: () => Promise.resolve(binary),
        }),
      })
    ).rejects.toThrow('archive SHA-256 mismatch');
  });
});
