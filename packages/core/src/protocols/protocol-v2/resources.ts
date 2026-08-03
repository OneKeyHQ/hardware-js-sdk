import { sha256 } from '@noble/hashes/sha256';

import type {
  IProtocolV2BootResources,
  IProtocolV2Resource,
  IProtocolV2ResourceType,
  IProtocolV2Resources,
} from '../../types';
import type { DeviceCommands } from '../../device/DeviceCommands';
import type { ResourceInventory } from '@onekeyfe/hd-transport';

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
export const PROTOCOL_V2_RESOURCE_INVENTORY_TIMEOUT_MS = 5 * 1000;

const RESOURCE_TYPE_BY_DEVICE_VALUE: Readonly<Record<string, IProtocolV2ResourceType>> = {
  '0': 'images',
  IMAGES: 'images',
  '1': 'animation',
  ANIMATION: 'animation',
  '2': 'wallpaper',
  WALLPAPER: 'wallpaper',
  '3': 'translations',
  TRANSLATIONS: 'translations',
  '4': 'roobert',
  ROOBERT: 'roobert',
  '5': 'noto',
  NOTO: 'noto',
};

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

/** Normalize the success-only device response into the SDK resource identity shape. */
export function parseProtocolV2ResourceInventory(
  value: ResourceInventory | unknown
): ProtocolV2ResourceInventoryItem[] {
  const items = (value as { items?: unknown })?.items;
  if (!Array.isArray(items)) {
    throw new Error('Invalid Pro2 resource inventory: items must be an array');
  }

  const inventory = items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid Pro2 resource inventory item at ${index}`);
    }
    const raw = item as { type?: unknown; size?: unknown; header_hash?: unknown };
    const type = RESOURCE_TYPE_BY_DEVICE_VALUE[String(raw.type).toUpperCase()];
    if (!type) {
      throw new Error(`Invalid Pro2 resource inventory type at ${index}`);
    }
    if (!Number.isSafeInteger(raw.size) || Number(raw.size) <= 0) {
      throw new Error(`Invalid Pro2 resource inventory size at ${index}`);
    }
    return {
      type,
      size: Number(raw.size),
      headerHash: normalizeHex(raw.header_hash, SHA3_512_HEX_LENGTH, 'inventory headerHash'),
    };
  });

  if (new Set(inventory.map(item => item.type)).size !== inventory.length) {
    throw new Error('Invalid Pro2 resource inventory: duplicate resource type');
  }
  return PROTOCOL_V2_RESOURCE_TYPES.flatMap(type => {
    const item = inventory.find(candidate => candidate.type === type);
    return item ? [item] : [];
  });
}

export async function requestProtocolV2ResourceInventory({
  commands,
  timeoutMs = PROTOCOL_V2_RESOURCE_INVENTORY_TIMEOUT_MS,
}: {
  commands: DeviceCommands;
  timeoutMs?: number;
}): Promise<ProtocolV2ResourceInventoryItem[]> {
  const { message } = await commands.typedCall(
    'ResourceInventoryGet',
    'ResourceInventory',
    {},
    { timeoutMs }
  );
  return parseProtocolV2ResourceInventory(message);
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
  if (resource.target !== 'CRATE') {
    throw new Error('Invalid Pro2 boot resources target: expected CRATE');
  }
  if (typeof resource.url !== 'string' || !resource.url.startsWith('https://')) {
    throw new Error('Invalid Pro2 boot resources url');
  }
  if (!Number.isSafeInteger(resource.size) || Number(resource.size) <= 0) {
    throw new Error('Invalid Pro2 boot resources size');
  }
  return {
    required: false,
    target: 'CRATE',
    url: resource.url,
    size: Number(resource.size),
    fileHash: normalizeHex(resource.fileHash, SHA256_HEX_LENGTH, 'boot fileHash'),
    payloadHash: normalizeHex(resource.payloadHash, SHA3_512_HEX_LENGTH, 'boot payloadHash'),
    headerHash: normalizeHex(resource.headerHash, SHA3_512_HEX_LENGTH, 'boot headerHash'),
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

/** Compare the application inventory or select the full set for bootloader recovery. */
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
  if (mode === 'bootloader-recovery' || forced) {
    return {
      status: resources.length > 0 ? 'outdated' : 'valid',
      resources: [...resources],
    };
  }
  if (!inventory) {
    return { status: 'unknown', resources: [] };
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
  resource: Pick<IProtocolV2Resource, 'size' | 'fileHash'>
): boolean {
  if (binary.byteLength !== resource.size) return false;
  return bytesToHex(sha256(new Uint8Array(binary))) === resource.fileHash.toLowerCase();
}
