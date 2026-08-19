import { bytesToHex } from '@noble/hashes/utils';

import type { IProtocolV2Resources, IVersionArray } from '../../types';

export const PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_PATH =
  'vol0:/loaders/bootloader/boot_resource.okpkg';
export const PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_STAGING_PATH = `${PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_PATH}.staging`;
export const PROTOCOL_V2_ROM_PARAMS_PACKAGE_PATH = 'vol0:/loaders/rom/params.okpkg';
export const PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_SIZE = 0x5f90;

const PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_VERSION = 1;
const PROTOCOL_V2_RESOURCE_PACKAGE_FLEXIBLE_OFFSET = 0x6c;
const PROTOCOL_V2_RESOURCE_PACKAGE_FLEXIBLE_SIZE = 64;
const PROTOCOL_V2_RESOURCE_PACKAGE_PAYLOAD_HASH_OFFSET = 0x200;
const PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_HASH_OFFSET = 0x240;
const PROTOCOL_V2_RESOURCE_PACKAGE_HASH_SIZE = 64;
const PROTOCOL_V2_RESOURCE_PACKAGE_TYPE = 'RESC';

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

export function isProtocolV2ResourceArchiveEntryName(entryName: string): boolean {
  const normalized = entryName.replace(/\\/g, '/');
  if (!normalized.toLowerCase().endsWith('.okpkg')) {
    return false;
  }
  const parts = normalized.split('/');
  const fileName = parts[parts.length - 1] ?? '';
  return (
    fileName.length > 0 &&
    !fileName.startsWith('.') &&
    !parts.some(part => part === '__MACOSX' || part === '.' || part === '..' || part === '')
  );
}

const PROTOCOL_V2_RESOURCE_DEVICE_RULES = [
  { root: 'vol0:/bundles/', suffix: '.okpkg' },
  { root: 'vol0:/loaders/rom/', suffix: '.okpkg' },
  { root: 'vol0:/loaders/bootloader/', suffix: '.okpkg.staging' },
] as const;

function isSafeResourceDevicePath(path: string): boolean {
  return !(
    path.includes('\\') ||
    path.includes('//') ||
    [...path].some(char => {
      const code = char.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    }) ||
    path.split('/').some(part => part === '.' || part === '..')
  );
}

function isAllowedResourceDevicePath(path: string): boolean {
  if (!isSafeResourceDevicePath(path)) {
    return false;
  }
  return PROTOCOL_V2_RESOURCE_DEVICE_RULES.some(
    rule =>
      path.startsWith(rule.root) &&
      path.endsWith(rule.suffix) &&
      path.length > rule.root.length + rule.suffix.length
  );
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return Array.from(bytes.slice(offset, offset + length))
    .map(byte => String.fromCharCode(byte))
    .join('');
}

function readResourceDevicePath(bytes: Uint8Array): string {
  const metadata = bytes.slice(
    PROTOCOL_V2_RESOURCE_PACKAGE_FLEXIBLE_OFFSET,
    PROTOCOL_V2_RESOURCE_PACKAGE_FLEXIBLE_OFFSET + PROTOCOL_V2_RESOURCE_PACKAGE_FLEXIBLE_SIZE
  );
  const terminator = metadata.indexOf(0);
  const pathBytes = terminator === -1 ? metadata : metadata.slice(0, terminator);
  const padding = terminator === -1 ? new Uint8Array(0) : metadata.slice(terminator);
  if (
    pathBytes.byteLength === 0 ||
    Array.from(pathBytes).some(byte => byte < 0x20 || byte > 0x7e) ||
    Array.from(padding).some(byte => byte !== 0)
  ) {
    throw new Error('Invalid Pro2 RESOURCE package device path metadata');
  }
  const path = readAscii(pathBytes, 0, pathBytes.byteLength);
  if (!isAllowedResourceDevicePath(path)) {
    throw new Error(`Invalid Pro2 RESOURCE package device path: ${path}`);
  }
  return path;
}

export type ProtocolV2ResourcePackageHeader = {
  version: IVersionArray;
  payloadLength: number;
  devicePath: string;
  payloadHash: string;
  headerHash: string;
};

export function parseProtocolV2ResourcePackageHeader(
  bytes: Uint8Array,
  packageSize: number
): ProtocolV2ResourcePackageHeader {
  if (bytes.byteLength < PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_SIZE) {
    throw new Error('Pro2 RESOURCE package is shorter than its header');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerVersion = view.getUint32(0x04, true);
  const headerLength = view.getUint32(0x0c, true);
  const payloadLength = view.getUint32(0x14, true);
  if (
    readAscii(bytes, 0, 4) !== 'OKPP' ||
    readAscii(bytes, 0x08, 4) !== PROTOCOL_V2_RESOURCE_PACKAGE_TYPE ||
    headerVersion !== PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_VERSION ||
    headerLength !== PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_SIZE ||
    payloadLength <= 0 ||
    headerLength + payloadLength !== packageSize
  ) {
    throw new Error('Invalid Pro2 RESOURCE package header');
  }

  const packedVersion = view.getUint32(0x10, true);
  return {
    version: [
      Math.floor(packedVersion / 0x10000) % 0x100,
      Math.floor(packedVersion / 0x100) % 0x100,
      packedVersion % 0x100,
    ],
    payloadLength,
    devicePath: readResourceDevicePath(bytes),
    payloadHash: bytesToHex(
      bytes.slice(
        PROTOCOL_V2_RESOURCE_PACKAGE_PAYLOAD_HASH_OFFSET,
        PROTOCOL_V2_RESOURCE_PACKAGE_PAYLOAD_HASH_OFFSET + PROTOCOL_V2_RESOURCE_PACKAGE_HASH_SIZE
      )
    ),
    headerHash: bytesToHex(
      bytes.slice(
        PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_HASH_OFFSET,
        PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_HASH_OFFSET + PROTOCOL_V2_RESOURCE_PACKAGE_HASH_SIZE
      )
    ),
  };
}

export function parseProtocolV2ResourcePackage(
  binary: ArrayBuffer | Uint8Array
): ProtocolV2ResourcePackageHeader {
  const bytes = binary instanceof Uint8Array ? binary : new Uint8Array(binary);
  return parseProtocolV2ResourcePackageHeader(bytes, bytes.byteLength);
}
