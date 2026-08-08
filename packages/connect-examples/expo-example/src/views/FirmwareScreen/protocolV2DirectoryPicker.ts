export type BrowserFileSystemFileHandle = {
  kind: 'file';
  getFile: () => Promise<File>;
};

export type BrowserFileSystemDirectoryHandle = {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<BrowserFileSystemFileHandle | BrowserFileSystemDirectoryHandle>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read';
  }) => Promise<BrowserFileSystemDirectoryHandle>;
};

export const getBrowserDirectoryPicker = () => {
  if (typeof window === 'undefined') return undefined;
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  return picker?.bind(window);
};

export async function collectDirectoryFiles(
  directory: BrowserFileSystemDirectoryHandle
): Promise<File[]> {
  const files: File[] = [];
  for await (const handle of directory.values()) {
    if (handle.kind === 'file') files.push(await handle.getFile());
    else files.push(...(await collectDirectoryFiles(handle)));
  }
  return files;
}

export const isDirectoryPickerCancelled = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';
