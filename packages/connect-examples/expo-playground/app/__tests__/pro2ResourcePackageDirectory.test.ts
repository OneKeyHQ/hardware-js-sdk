import { matchPro2ResourcePackageDirectory } from '../utils/pro2ResourcePackageDirectory';

const slots = [
  { key: 'images', label: 'Images', fileNamePrefix: 'images' },
  { key: 'boot_resource', label: 'Boot Resource', fileNamePrefix: 'boot_resource' },
] as const;

function createFile(name: string) {
  return { name } as File;
}

describe('Pro2 resource package directory', () => {
  test('matches release-suffixed and simplified package names without a manifest', () => {
    const result = matchPro2ResourcePackageDirectory(
      [
        createFile('manifest.json'),
        createFile('images-resource-build-id.okpkg'),
        createFile('boot_resource.okpkg'),
      ],
      slots
    );

    expect(result.images.name).toBe('images-resource-build-id.okpkg');
    expect(result.boot_resource.name).toBe('boot_resource.okpkg');
  });

  test('rejects incomplete directories', () => {
    expect(() =>
      matchPro2ResourcePackageDirectory([createFile('images.okpkg')], slots)
    ).toThrow('Missing resource package: Boot Resource');
  });

  test('rejects duplicate packages', () => {
    expect(() =>
      matchPro2ResourcePackageDirectory(
        [
          createFile('images.okpkg'),
          createFile('images-resource-build-id.okpkg'),
          createFile('boot_resource.okpkg'),
        ],
        slots
      )
    ).toThrow('Duplicate resource package: Images');
  });
});
