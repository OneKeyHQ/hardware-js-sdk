import { sha256 } from '@noble/hashes/sha256';
import { PROTOCOL_V2_BLE_FILE_READ_CHUNK_SIZE } from '@onekeyfe/hd-transport';

import type {
  IProtocolV2BootResources,
  IProtocolV2Resource,
  IProtocolV2ResourceFile,
  IProtocolV2ResourceType,
  IProtocolV2Resources,
} from '../../types';
import type { DeviceCommands } from '../../device/DeviceCommands';

export const PROTOCOL_V2_RESOURCE_TYPES = [
  'images',
  'animation',
  'wallpaper',
  'translations',
  'roobert',
  'noto',
] as const satisfies readonly IProtocolV2ResourceType[];

export const PROTOCOL_V2_RESOURCE_DEVICE_PATHS: Readonly<Record<IProtocolV2ResourceType, string>> =
  {
    images: 'vol0:/bundles/images/images.okpkg',
    animation: 'vol0:/bundles/images/animation.okpkg',
    wallpaper: 'vol0:/bundles/images/wallpaper.okpkg',
    translations: 'vol0:/bundles/translations/translations.okpkg',
    roobert: 'vol0:/bundles/font/roobert.okpkg',
    noto: 'vol0:/bundles/font/noto.okpkg',
  };

const RESOURCE_TYPE_SET = new Set<string>(PROTOCOL_V2_RESOURCE_TYPES);
const SHA256_HEX_LENGTH = 64;
const SHA3_512_HEX_LENGTH = 128;
const PROTOCOL_V2_OKPP_HEADER_SIZE = 0x52a0;
const PROTOCOL_V2_OKPP_TYPE_OFFSET = 0x08;
const PROTOCOL_V2_OKPP_HEADER_LENGTH_OFFSET = 0x0c;
const PROTOCOL_V2_OKPP_HEADER_HASH_OFFSET = 0x240;
const PROTOCOL_V2_OKPP_HASH_SIZE = 64;
const PROTOCOL_V2_RESOURCE_IDENTITY_READ_SIZE =
  PROTOCOL_V2_OKPP_HEADER_HASH_OFFSET + PROTOCOL_V2_OKPP_HASH_SIZE;
const PROTOCOL_V2_MIN_FILE_READ_CHUNK_SIZE = 64;
export const PROTOCOL_V2_RESOURCE_INVENTORY_TIMEOUT_MS = 5 * 1000;

export type ProtocolV2ResourceInventoryItem = {
  type: IProtocolV2ResourceType;
  size: number;
  headerHash: string;
};

export type ProtocolV2ResourceUpdateMode = 'application' | 'bootloader-recovery';

export type ProtocolV2ResourceUpdatePlan = {
  status: 'valid' | 'outdated' | 'unknown';
  resources: IProtocolV2Resource[];
};

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (value && typeof value === 'object') {
    const longLike = value as { toNumber?: () => number };
    if (typeof longLike.toNumber === 'function') {
      const numeric = longLike.toNumber();
      return Number.isFinite(numeric) ? numeric : undefined;
    }
  }
  return undefined;
}

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === 'string') {
    const hex = value.replace(/^0x/i, '');
    if (!hex || hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
      return new Uint8Array(0);
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    }
    return bytes;
  }
  return new Uint8Array(0);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return Array.from(bytes.slice(offset, offset + length), byte => String.fromCharCode(byte)).join(
    ''
  );
}

function parseProtocolV2ResourceHeaderHash(bytes: Uint8Array): string | undefined {
  if (bytes.byteLength < PROTOCOL_V2_RESOURCE_IDENTITY_READ_SIZE) return undefined;
  if (readAscii(bytes, 0, 4) !== 'OKPP') return undefined;
  if (readAscii(bytes, PROTOCOL_V2_OKPP_TYPE_OFFSET, 4) !== 'RESC') return undefined;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(PROTOCOL_V2_OKPP_HEADER_LENGTH_OFFSET, true) !== PROTOCOL_V2_OKPP_HEADER_SIZE
  ) {
    return undefined;
  }
  return bytesToHex(
    bytes.slice(
      PROTOCOL_V2_OKPP_HEADER_HASH_OFFSET,
      PROTOCOL_V2_OKPP_HEADER_HASH_OFFSET + PROTOCOL_V2_OKPP_HASH_SIZE
    )
  );
}

async function readProtocolV2ResourceIdentity({
  commands,
  resource,
  chunkSize,
  timeoutMs = PROTOCOL_V2_RESOURCE_INVENTORY_TIMEOUT_MS,
}: {
  commands: Pick<DeviceCommands, 'typedCall'>;
  resource: IProtocolV2Resource;
  chunkSize: number;
  timeoutMs?: number;
}): Promise<ProtocolV2ResourceInventoryItem | undefined> {
  const path = PROTOCOL_V2_RESOURCE_DEVICE_PATHS[resource.type];
  const pathInfo = await commands.typedCall(
    'FilesystemPathInfoQuery',
    'FilesystemPathInfo',
    { path },
    { timeoutMs }
  );
  const size = toFiniteNumber(pathInfo.message?.size);
  if (
    !pathInfo.message?.exist ||
    pathInfo.message?.directory ||
    !Number.isSafeInteger(size) ||
    size !== resource.size ||
    size < PROTOCOL_V2_OKPP_HEADER_SIZE
  ) {
    return undefined;
  }

  const header = new Uint8Array(PROTOCOL_V2_RESOURCE_IDENTITY_READ_SIZE);
  let offset = 0;
  while (offset < header.byteLength) {
    const readLength = Math.min(chunkSize, header.byteLength - offset);
    const response = await commands.typedCall(
      'FilesystemFileRead',
      'FilesystemFile',
      {
        file: { path, offset, total_size: 0 },
        chunk_len: readLength,
      },
      { timeoutMs }
    );
    const data = toUint8Array(response.message?.data);
    if (data.byteLength === 0) return undefined;
    const copied = Math.min(data.byteLength, header.byteLength - offset);
    header.set(data.subarray(0, copied), offset);
    offset += copied;
  }

  const headerHash = parseProtocolV2ResourceHeaderHash(header);
  return headerHash ? { type: resource.type, size, headerHash } : undefined;
}

/**
 * 使用已发布 Pro2 固件支持的文件系统消息构建资源清单。
 * 缺失、无法读取或格式错误的文件不会进入清单，因此会被选中重写。
 */
export async function readProtocolV2ResourceInventory({
  commands,
  resources,
  chunkSize = PROTOCOL_V2_BLE_FILE_READ_CHUNK_SIZE,
  timeoutMs = PROTOCOL_V2_RESOURCE_INVENTORY_TIMEOUT_MS,
}: {
  commands: Pick<DeviceCommands, 'typedCall'>;
  resources: readonly IProtocolV2Resource[];
  chunkSize?: number;
  timeoutMs?: number;
}): Promise<ProtocolV2ResourceInventoryItem[]> {
  const normalizedChunkSize = Number.isFinite(chunkSize)
    ? Math.max(Math.floor(chunkSize), PROTOCOL_V2_MIN_FILE_READ_CHUNK_SIZE)
    : PROTOCOL_V2_BLE_FILE_READ_CHUNK_SIZE;
  const inventory: ProtocolV2ResourceInventoryItem[] = [];
  for (const resource of resources) {
    try {
      const item = await readProtocolV2ResourceIdentity({
        commands,
        resource,
        chunkSize: normalizedChunkSize,
        timeoutMs,
      });
      if (item) inventory.push(item);
    } catch {
      // 单个资源无法读取时按缺失处理，不阻断其余资源的增量检查。
    }
  }
  return inventory;
}

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

function validateResource(value: unknown, index: number): IProtocolV2Resource {
  if (!value || typeof value !== 'object') {
    throw new Error(`Invalid Pro2 resource at stable[${index}]`);
  }
  const resource = value as Partial<IProtocolV2Resource>;
  if (typeof resource.type !== 'string' || !RESOURCE_TYPE_SET.has(resource.type)) {
    throw new Error(`Invalid Pro2 resource type at stable[${index}]`);
  }
  if (typeof resource.url !== 'string' || !resource.url.startsWith('https://')) {
    throw new Error(`Invalid Pro2 resource url at stable[${index}]`);
  }
  if (!Number.isSafeInteger(resource.size) || Number(resource.size) <= 0) {
    throw new Error(`Invalid Pro2 resource size at stable[${index}]`);
  }
  return {
    type: resource.type,
    url: resource.url,
    size: Number(resource.size),
    fileHash: normalizeHex(resource.fileHash, SHA256_HEX_LENGTH, 'fileHash'),
    headerHash: normalizeHex(resource.headerHash, SHA3_512_HEX_LENGTH, 'headerHash'),
  };
}

function validateBootResources(value: unknown): IProtocolV2BootResources {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid Pro2 boot resources config');
  }
  const resource = value as Partial<IProtocolV2BootResources>;
  if (resource.required !== false) {
    throw new Error('Invalid Pro2 boot resources required flag: expected false');
  }
  if (resource.target !== 'RES') {
    throw new Error('Invalid Pro2 boot resources target: expected RES');
  }
  if (
    resource.manifestUrl !== undefined &&
    (typeof resource.manifestUrl !== 'string' || !resource.manifestUrl.startsWith('https://'))
  ) {
    throw new Error('Invalid Pro2 boot resources manifestUrl');
  }
  if (!Array.isArray(resource.files) || resource.files.length === 0) {
    throw new Error('Invalid Pro2 boot resources files');
  }
  const files = resource.files.map((value, index): IProtocolV2ResourceFile => {
    if (!value || typeof value !== 'object') {
      throw new Error(`Invalid Pro2 boot resource file at files[${index}]`);
    }
    const file = value as Partial<IProtocolV2ResourceFile>;
    if (typeof file.url !== 'string' || !file.url.startsWith('https://')) {
      throw new Error(`Invalid Pro2 boot resource url at files[${index}]`);
    }
    if (
      typeof file.devicePath !== 'string' ||
      !file.devicePath.startsWith('vol0:/') ||
      file.devicePath.includes('..') ||
      file.devicePath.includes('\\\\')
    ) {
      throw new Error(`Invalid Pro2 boot resource devicePath at files[${index}]`);
    }
    if (!Number.isSafeInteger(file.size) || Number(file.size) <= 0) {
      throw new Error(`Invalid Pro2 boot resource size at files[${index}]`);
    }
    return {
      ...(typeof file.name === 'string' && file.name ? { name: file.name } : undefined),
      url: file.url,
      devicePath: file.devicePath,
      size: Number(file.size),
      fileHash: normalizeHex(file.fileHash, SHA256_HEX_LENGTH, `boot files[${index}].fileHash`),
    };
  });
  if (new Set(files.map(file => file.devicePath)).size !== files.length) {
    throw new Error('Invalid Pro2 boot resources files: duplicate devicePath');
  }
  return {
    required: false,
    target: 'RES',
    ...(resource.manifestUrl ? { manifestUrl: resource.manifestUrl } : undefined),
    files,
  };
}

/** Validate a complete Pro2 stable resource set from remote configuration. */
export function parseProtocolV2Resources(value: unknown): IProtocolV2Resources | undefined {
  if (value === undefined) return undefined;
  if (
    !value ||
    typeof value !== 'object' ||
    !Array.isArray((value as { stable?: unknown }).stable)
  ) {
    throw new Error('Invalid Pro2 resources config: stable must be an array');
  }

  const config = value as { stable: unknown[]; boot?: unknown };
  const stable = config.stable.map(validateResource);
  const types = new Set(stable.map(resource => resource.type));
  if (stable.length !== PROTOCOL_V2_RESOURCE_TYPES.length || types.size !== stable.length) {
    throw new Error('Invalid Pro2 resources config: stable must contain six unique resource types');
  }
  for (const type of PROTOCOL_V2_RESOURCE_TYPES) {
    if (!types.has(type)) {
      throw new Error(`Invalid Pro2 resources config: stable is missing ${type}`);
    }
  }
  const boot = config.boot === undefined ? undefined : validateBootResources(config.boot);
  return {
    stable: PROTOCOL_V2_RESOURCE_TYPES.map(type => {
      const resource = stable.find(item => item.type === type);
      if (!resource) {
        throw new Error(`Invalid Pro2 resources config: stable is missing ${type}`);
      }
      return resource;
    }),
    ...(boot ? { boot } : undefined),
  };
}

/** 比较文件系统资源清单；恢复模式无法取得清单时回退到全量更新。 */
export function buildProtocolV2ResourceUpdatePlan({
  resources,
  inventory,
  mode,
  forced = false,
}: {
  resources: readonly IProtocolV2Resource[];
  inventory?: readonly ProtocolV2ResourceInventoryItem[];
  mode: ProtocolV2ResourceUpdateMode;
  forced?: boolean;
}): ProtocolV2ResourceUpdatePlan {
  if (forced) {
    return {
      status: resources.length > 0 ? 'outdated' : 'valid',
      resources: [...resources],
    };
  }
  if (!inventory) {
    return mode === 'bootloader-recovery'
      ? {
          status: resources.length > 0 ? 'outdated' : 'valid',
          resources: [...resources],
        }
      : { status: 'unknown', resources: [] };
  }

  const inventoryByType = new Map(inventory.map(item => [item.type, item]));
  const changedResources = resources.filter(resource => {
    const current = inventoryByType.get(resource.type);
    return (
      !current ||
      current.size !== resource.size ||
      current.headerHash.toLowerCase() !== resource.headerHash.toLowerCase()
    );
  });

  return {
    status: changedResources.length === 0 ? 'valid' : 'outdated',
    resources: changedResources,
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Verify the complete downloaded file before any device mutation. */
export function isProtocolV2ResourceFileValid(
  binary: ArrayBuffer,
  resource: Pick<IProtocolV2ResourceFile, 'size' | 'fileHash'>
): boolean {
  if (binary.byteLength !== resource.size) return false;
  return bytesToHex(sha256(new Uint8Array(binary))) === resource.fileHash.toLowerCase();
}
