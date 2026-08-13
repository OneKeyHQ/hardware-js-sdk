import type {
  IProtocolV2ResourceManifest,
  IProtocolV2ResourceManifestFile,
  IProtocolV2Resources,
} from '../../types';
import type { FirmwareUpdateV4Target } from '../../types/api/firmwareUpdate';

export const PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_PATH =
  'vol0:/loaders/bootloader/boot_resource.okpkg';
export const PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_STAGING_PATH = `${PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_PATH}.staging`;
export const PROTOCOL_V2_ROM_PARAMS_PACKAGE_PATH = 'vol0:/loaders/rom/params.okpkg';

const SHA256_HEX_LENGTH = 64;

function normalizeHex(value: unknown, expectedLength: number, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid Pro2 resource ${field}: expected a hexadecimal string`);
  }
  const normalized = value.replace(/^0x/i, '').toLowerCase();
  if (normalized.length !== expectedLength || !/^[0-9a-f]+$/.test(normalized)) {
    throw new Error(
      `Invalid Pro2 resource ${field}: expected ${expectedLength} hexadecimal characters`
    );
  }
  return normalized;
}

/** Validate a complete Pro2 stable resource set from remote configuration. */
export function parseProtocolV2Resources(value: unknown): IProtocolV2Resources | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid Pro2 resources config');
  }
  const { source } = value as { source?: unknown };
  if (!source || typeof source !== 'object') {
    throw new Error('Invalid Pro2 resources config: source is required');
  }
  const { archiveUrl, archiveSha256, archiveSize } = source as {
    archiveUrl?: unknown;
    archiveSha256?: unknown;
    archiveSize?: unknown;
  };
  if (typeof archiveUrl !== 'string' || !archiveUrl.startsWith('https://')) {
    throw new Error('Invalid Pro2 resources config: source.archiveUrl must use HTTPS');
  }
  if (typeof archiveSha256 !== 'string' || !/^[0-9a-fA-F]{64}$/.test(archiveSha256)) {
    throw new Error('Invalid Pro2 resources config: source.archiveSha256 must be a SHA-256 digest');
  }
  if (!Number.isSafeInteger(archiveSize) || (archiveSize as number) <= 0) {
    throw new Error('Invalid Pro2 resources config: source.archiveSize must be a positive integer');
  }
  return {
    source: {
      archiveUrl,
      archiveSha256: archiveSha256.toLowerCase(),
      archiveSize: archiveSize as number,
    },
  };
}

const PROTOCOL_V2_RESOURCE_MANIFEST_DEVICE_ROOTS = [
  'vol0:/bundles/',
  'vol0:/loaders/rom/',
] as const;

function isAllowedManifestDevicePath(path: string): boolean {
  if (
    !path.endsWith('.okpkg') ||
    path.includes('\\') ||
    path.includes('//') ||
    path.split('/').some(part => part === '.' || part === '..')
  ) {
    return false;
  }
  if (path === PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_PATH) {
    return true;
  }
  return PROTOCOL_V2_RESOURCE_MANIFEST_DEVICE_ROOTS.some(root => path.startsWith(root));
}

function assertManifestString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid Pro2 resource manifest ${field}`);
  }
  return value;
}

function assertManifestRelativePath(value: unknown, field: string): string {
  const path = assertManifestString(value, field);
  if (
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes(':') ||
    path.split('/').some(part => !part || part === '.' || part === '..')
  ) {
    throw new Error(`Invalid Pro2 resource manifest ${field}`);
  }
  return path;
}

function parseProtocolV2ResourceManifestFile(
  value: unknown,
  index: number
): IProtocolV2ResourceManifestFile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid Pro2 resource manifest files[${index}]`);
  }
  const file = value as Partial<IProtocolV2ResourceManifestFile>;
  const archivePath = assertManifestRelativePath(file.archive_path, `files[${index}].archive_path`);
  const originalName =
    file.original_name === undefined
      ? archivePath.split('/').pop() ?? archivePath
      : assertManifestRelativePath(file.original_name, `files[${index}].original_name`);
  if (originalName.includes('/')) {
    throw new Error(`Invalid Pro2 resource manifest files[${index}].original_name`);
  }
  const devicePath = assertManifestString(file.device_path, `files[${index}].device_path`);
  if (!isAllowedManifestDevicePath(devicePath)) {
    throw new Error(`Invalid Pro2 resource manifest files[${index}].device_path`);
  }
  if (!Number.isSafeInteger(file.size) || Number(file.size) <= 0) {
    throw new Error(`Invalid Pro2 resource manifest files[${index}].size`);
  }
  const digest = normalizeHex(file.sha256, SHA256_HEX_LENGTH, `files[${index}].sha256`);
  if (!archivePath.endsWith('.okpkg') || !originalName.endsWith('.okpkg')) {
    throw new Error(`Invalid Pro2 resource manifest files[${index}] package extension`);
  }
  return {
    archive_path: archivePath,
    original_name: originalName,
    device_path: devicePath,
    size: Number(file.size),
    sha256: digest,
    ...(file.signed === undefined ? {} : { signed: file.signed }),
    ...(file.sig_algo === undefined ? {} : { sig_algo: file.sig_algo }),
    ...(file.payload_version === undefined ? {} : { payload_version: file.payload_version }),
  };
}

export function parseProtocolV2ResourceManifest(value: unknown): IProtocolV2ResourceManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Pro2 resource manifest');
  }
  const manifest = value as Partial<IProtocolV2ResourceManifest>;
  if (!Array.isArray(manifest.files)) {
    throw new Error('Invalid Pro2 resource manifest files');
  }
  const files = manifest.files.map(parseProtocolV2ResourceManifestFile);
  const devicePaths = new Set(files.map(file => file.device_path));
  const archivePaths = new Set(files.map(file => file.archive_path));
  if (
    files.length === 0 ||
    devicePaths.size !== files.length ||
    archivePaths.size !== files.length
  ) {
    throw new Error('Invalid Pro2 resource manifest file set');
  }
  return {
    files,
  };
}

export function selectProtocolV2ResourceManifestFiles({
  manifest,
  targetsToUpdate,
}: {
  manifest: IProtocolV2ResourceManifest;
  targetsToUpdate: readonly FirmwareUpdateV4Target[];
}): IProtocolV2ResourceManifestFile[] {
  return targetsToUpdate.includes('resource') ? [...manifest.files] : [];
}
