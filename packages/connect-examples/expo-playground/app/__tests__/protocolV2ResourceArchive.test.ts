import { sha256 } from '@noble/hashes/sha256';
import JSZip from 'jszip';
import { prepareProtocolV2ResourceFiles } from '@onekeyfe/hd-core';

import { prepareRemoteProtocolV2ResourceFiles } from '../utils/protocolV2ResourceArchive';

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

test('prepares verified files from the remote Protocol V2 archive', async () => {
  const firmwareLogo = new Uint8Array([1, 2, 3]);
  const bootResource = new Uint8Array([4, 5, 6]);
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
    files: [
      {
        archive_path: 'bundles/firmware_logo.okpkg',
        original_name: 'firmware_logo.okpkg',
        device_path: 'vol0:/bundles/firmware_logo.okpkg',
        size: firmwareLogo.byteLength,
        sha256: bytesToHex(sha256(firmwareLogo)),
        signed: true,
        sig_algo: 'ed25519',
        payload_version: '1.0.0',
      },
      {
        archive_path: 'loaders/bootloader/boot_resource.okpkg',
        original_name: 'boot_resource.okpkg',
        device_path: 'vol0:/loaders/bootloader/boot_resource.okpkg',
        size: bootResource.byteLength,
        sha256: bytesToHex(sha256(bootResource)),
        signed: true,
        sig_algo: 'ed25519',
        payload_version: '1.0.0',
      },
    ],
  };
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest));
  zip.file('bundles/firmware_logo.okpkg', firmwareLogo);
  zip.file('loaders/bootloader/boot_resource.okpkg', bootResource);
  const binary = await zip.generateAsync({ type: 'arraybuffer' });
  const result = await prepareRemoteProtocolV2ResourceFiles({
    hardwareSDK: { prepareProtocolV2ResourceFiles },
    archive: {
      archiveUrl: 'https://example.com/protocol-v2-resources.zip',
      archiveSha256: bytesToHex(sha256(new Uint8Array(binary))),
      archiveSize: binary.byteLength,
    },
    targetsToUpdate: ['resource'],
    fetcher: jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(binary),
    }),
  });

  expect(result).toHaveLength(2);
  expect(result?.[1]?.devicePath).toBe(
    'vol0:/loaders/bootloader/boot_resource.okpkg'
  );
});
