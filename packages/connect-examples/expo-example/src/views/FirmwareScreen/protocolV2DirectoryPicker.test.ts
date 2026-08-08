import { collectDirectoryFiles } from './protocolV2DirectoryPicker';

import type {
  BrowserFileSystemDirectoryHandle,
  BrowserFileSystemFileHandle,
} from './protocolV2DirectoryPicker';

const fileHandle = (name: string): BrowserFileSystemFileHandle => ({
  kind: 'file',
  getFile: () => Promise.resolve({ name } as File),
});

const directoryHandle = (
  name: string,
  children: Array<BrowserFileSystemFileHandle | BrowserFileSystemDirectoryHandle>
): BrowserFileSystemDirectoryHandle => ({
  kind: 'directory',
  name,
  values: async function* values() {
    await Promise.resolve();
    yield* children;
  },
});

describe('Protocol V2 browser directory picker', () => {
  test('collects files recursively from the selected directory', async () => {
    const directory = directoryHandle('resources', [
      fileHandle('firmware_logo.okpkg'),
      directoryHandle('images', [fileHandle('images.okpkg'), fileHandle('animation.okpkg')]),
    ]);

    await expect(collectDirectoryFiles(directory)).resolves.toEqual([
      { name: 'firmware_logo.okpkg' },
      { name: 'images.okpkg' },
      { name: 'animation.okpkg' },
    ]);
  });
});
