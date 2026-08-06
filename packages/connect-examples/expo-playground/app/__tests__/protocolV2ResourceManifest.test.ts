import {
  buildResourceFilesFromManifest,
  parseProtocolV2ResourceManifest,
} from '../utils/protocolV2ResourceManifest';

const sha256 = 'ab'.repeat(32);

const createFile = (
  name: string,
  webkitRelativePath: string,
  options: { text?: string; bytes?: Uint8Array } = {}
) => {
  const bytes = options.bytes ?? new Uint8Array();
  return {
    name,
    webkitRelativePath,
    size: bytes.byteLength,
    text: async () => options.text ?? '',
    arrayBuffer: async () => bytes.buffer,
  } as File;
};

describe('Protocol V2 resource manifest', () => {
  test('normalizes backslashes before removing every leading relative prefix', async () => {
    const manifest = createFile('manifest.json', 'resources/manifest.json', {
      text: JSON.stringify({
        schema: 1,
        files: [
          {
            archive_path: '.\\first.bin',
            device_path: 'vol0:/assets/first.bin',
            size: 1,
            sha256,
          },
          {
            archive_path: '././second.bin',
            device_path: 'vol0:/assets/second.bin',
            size: 1,
            sha256,
          },
        ],
      }),
    });
    const first = createFile('first.bin', 'resources/first.bin', { bytes: new Uint8Array([1]) });
    const second = createFile('second.bin', 'resources/second.bin', {
      bytes: new Uint8Array([2]),
    });

    await expect(buildResourceFilesFromManifest([manifest, first, second])).resolves.toEqual([
      expect.objectContaining({ devicePath: 'vol0:/assets/first.bin', size: 1 }),
      expect.objectContaining({ devicePath: 'vol0:/assets/second.bin', size: 1 }),
    ]);
  });

  test('rejects device paths containing a backslash', () => {
    expect(() =>
      parseProtocolV2ResourceManifest({
        schema: 1,
        files: [
          {
            archive_path: 'first.bin',
            device_path: 'vol0:/assets\\first.bin',
            size: 1,
            sha256,
          },
        ],
      })
    ).toThrow('Invalid resource manifest file at index 0');
  });
});
