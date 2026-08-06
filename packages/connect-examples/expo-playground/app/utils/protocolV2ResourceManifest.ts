export type ProtocolV2ManifestFile = {
  archive_path: string;
  device_path: string;
  size: number;
  sha256: string;
};

type ProtocolV2ResourceManifest = {
  schema: number;
  files: ProtocolV2ManifestFile[];
};

export type ProtocolV2ResourceFileInput = {
  binary: ArrayBuffer;
  devicePath: string;
  size: number;
  fileHash: string;
};

function normalizeRelativePath(path: string) {
  let normalized = path.replace(/\\/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

export function parseProtocolV2ResourceManifest(value: unknown): ProtocolV2ResourceManifest {
  if (!value || typeof value !== 'object') throw new Error('Invalid resource manifest');
  const manifest = value as Partial<ProtocolV2ResourceManifest>;
  if (manifest.schema !== 1 || !Array.isArray(manifest.files)) {
    throw new Error('Unsupported resource manifest schema');
  }
  const files = manifest.files.map((entry, index) => {
    if (
      !entry ||
      typeof entry.archive_path !== 'string' ||
      typeof entry.device_path !== 'string' ||
      !entry.device_path.startsWith('vol0:/') ||
      entry.device_path.includes('..') ||
      entry.device_path.includes('\\') ||
      !Number.isSafeInteger(entry.size) ||
      entry.size <= 0 ||
      typeof entry.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(entry.sha256)
    ) {
      throw new Error(`Invalid resource manifest file at index ${index}`);
    }
    return entry;
  });
  return { schema: 1, files };
}

export async function buildResourceFilesFromManifest(
  selectedFiles: readonly File[]
): Promise<ProtocolV2ResourceFileInput[]> {
  const manifestFile =
    selectedFiles.find(file =>
      normalizeRelativePath(file.webkitRelativePath || file.name).endsWith('/manifest.json')
    ) ?? selectedFiles.find(file => file.name === 'manifest.json');
  if (!manifestFile) throw new Error('The selected directory does not contain manifest.json');

  const manifest = parseProtocolV2ResourceManifest(JSON.parse(await manifestFile.text()));
  const filesByPath = new Map<string, File>();
  for (const file of selectedFiles) {
    const relativePath = normalizeRelativePath(file.webkitRelativePath || file.name);
    filesByPath.set(relativePath, file);
    const firstSlash = relativePath.indexOf('/');
    if (firstSlash >= 0) filesByPath.set(relativePath.slice(firstSlash + 1), file);
  }

  return Promise.all(
    manifest.files.map(async entry => {
      const file = filesByPath.get(normalizeRelativePath(entry.archive_path));
      if (!file) throw new Error(`Missing manifest resource: ${entry.archive_path}`);
      if (file.size !== entry.size) throw new Error(`Size mismatch: ${entry.archive_path}`);
      return {
        binary: await file.arrayBuffer(),
        devicePath: entry.device_path,
        size: entry.size,
        fileHash: entry.sha256.toLowerCase(),
      };
    })
  );
}
