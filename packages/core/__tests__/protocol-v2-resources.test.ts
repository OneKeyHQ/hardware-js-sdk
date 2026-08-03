import axios from 'axios';
import { sha256 } from '@noble/hashes/sha256';

import { DataManager } from '../src/data-manager';
import {
  PROTOCOL_V2_RESOURCE_DEVICE_PATHS,
  PROTOCOL_V2_RESOURCE_TYPES,
  buildProtocolV2ResourceUpdatePlan,
  isProtocolV2ResourceFileValid,
  parseProtocolV2ResourceInventory,
  parseProtocolV2Resources,
  requestProtocolV2ResourceInventory,
} from '../src/protocols/protocol-v2/resources';

import type {
  ConnectSettings,
  IProtocolV2BootResources,
  IProtocolV2Resource,
  RemoteConfigResponse,
} from '../src/types';

jest.mock('axios');
jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

const resources: IProtocolV2Resource[] = PROTOCOL_V2_RESOURCE_TYPES.map((type, index) => ({
  type,
  url: `https://example.com/${type}.okpkg`,
  size: index + 100,
  fileHash: index.toString(16).padStart(64, '0'),
  headerHash: index.toString(16).padStart(128, '0'),
}));

const bootResources: IProtocolV2BootResources = {
  required: false,
  target: 'CRATE',
  url: 'https://example.com/boot-resources.crate.okpkg',
  size: 1234,
  fileHash: 'ab'.repeat(32),
  payloadHash: 'cd'.repeat(64),
  headerHash: 'ef'.repeat(64),
};

const createSettings = (configFetcher: ConnectSettings['configFetcher']): ConnectSettings =>
  ({
    env: 'node',
    fetchConfig: true,
    preRelease: true,
    configFetcher,
  } as ConnectSettings);

const createRemoteConfig = (): RemoteConfigResponse =>
  ({
    classic: { firmware: [], ble: [] },
    classic1s: { firmware: [], ble: [] },
    classicpure: { firmware: [], ble: [] },
    mini: { firmware: [], ble: [] },
    touch: { firmware: [], ble: [] },
    pro: { firmware: [], ble: [] },
    pro2: { firmware: [], ble: [], resources: { stable: resources, boot: bootResources } },
    bridge: {},
  } as unknown as RemoteConfigResponse);

describe('Pro2 resource configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DataManager.lastCheckTimestamp = 0;
  });

  test('accepts exactly six resources and normalizes their deterministic order', () => {
    const parsed = parseProtocolV2Resources({
      stable: [...resources].reverse(),
      boot: bootResources,
    });

    expect(parsed?.stable.map(item => item.type)).toEqual(PROTOCOL_V2_RESOURCE_TYPES);
    expect(parsed?.boot).toEqual(bootResources);
    expect(PROTOCOL_V2_RESOURCE_DEVICE_PATHS.translations).toBe(
      'vol0:/bundles/translations/translations.okpkg'
    );
  });

  test('rejects incomplete, duplicate, or malformed stable sets', () => {
    expect(() => parseProtocolV2Resources({ stable: resources.slice(1) })).toThrow(
      'six unique resource types'
    );
    expect(() =>
      parseProtocolV2Resources({ stable: [...resources.slice(0, 5), resources[0]] })
    ).toThrow('six unique resource types');
    expect(() =>
      parseProtocolV2Resources({
        stable: resources.map((resource, index) =>
          index === 0 ? { ...resource, headerHash: 'bad' } : resource
        ),
      })
    ).toThrow('headerHash');
  });

  test('requires boot resources to remain optional and use a CRATE package', () => {
    expect(() =>
      parseProtocolV2Resources({
        stable: resources,
        boot: { ...bootResources, required: true },
      })
    ).toThrow('required flag');
    expect(() =>
      parseProtocolV2Resources({
        stable: resources,
        boot: { ...bootResources, target: 'RESC' },
      })
    ).toThrow('expected CRATE');
  });

  test('downloads nothing when all resource identities match', () => {
    const inventory = resources.map(({ type, size, headerHash }) => ({ type, size, headerHash }));

    expect(
      buildProtocolV2ResourceUpdatePlan({ resources, inventory, mode: 'application' })
    ).toEqual({ status: 'valid', resources: [] });
  });

  test('normalizes the success-only ResourceInventory RPC response', async () => {
    const items = resources.slice(0, 2).map((resource, index) => ({
      type: index === 0 ? 'IMAGES' : 1,
      size: resource.size,
      header_hash: resource.headerHash,
    }));
    const typedCall = jest.fn().mockResolvedValue({ message: { items } });

    await expect(
      requestProtocolV2ResourceInventory({ commands: { typedCall } as any })
    ).resolves.toEqual([
      {
        type: 'images',
        size: resources[0].size,
        headerHash: resources[0].headerHash,
      },
      {
        type: 'animation',
        size: resources[1].size,
        headerHash: resources[1].headerHash,
      },
    ]);
    expect(typedCall).toHaveBeenCalledWith(
      'ResourceInventoryGet',
      'ResourceInventory',
      {},
      { timeoutMs: 5000 }
    );
  });

  test('rejects malformed or duplicate inventory identities', () => {
    expect(() =>
      parseProtocolV2ResourceInventory({
        items: [
          { type: 'IMAGES', size: 1, header_hash: 'a'.repeat(128) },
          { type: 'IMAGES', size: 1, header_hash: 'b'.repeat(128) },
        ],
      })
    ).toThrow('duplicate resource type');
    expect(() =>
      parseProtocolV2ResourceInventory({
        items: [{ type: 'IMAGES', size: 1, header_hash: 'bad' }],
      })
    ).toThrow('inventory headerHash');
  });

  test('selects only the changed or missing resource in application mode', () => {
    const inventory = resources
      .filter(resource => resource.type !== 'noto')
      .map(({ type, size, headerHash }) => ({
        type,
        size: type === 'images' ? size + 1 : size,
        headerHash,
      }));

    const result = buildProtocolV2ResourceUpdatePlan({
      resources,
      inventory,
      mode: 'application',
    });

    expect(result.status).toBe('outdated');
    expect(result.resources.map(resource => resource.type)).toEqual(['images', 'noto']);
  });

  test('reports unknown without an application inventory and selects all in recovery mode', () => {
    expect(buildProtocolV2ResourceUpdatePlan({ resources, mode: 'application' })).toEqual({
      status: 'unknown',
      resources: [],
    });
    expect(
      buildProtocolV2ResourceUpdatePlan({ resources, mode: 'bootloader-recovery' }).resources
    ).toHaveLength(6);
  });

  test('verifies both full file size and SHA-256 before transfer', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const binary = bytes.buffer;
    const identity = { size: bytes.byteLength, fileHash: bytesToHex(sha256(bytes)) };

    expect(isProtocolV2ResourceFileValid(binary, identity)).toBe(true);
    expect(isProtocolV2ResourceFileValid(binary, { ...identity, size: 4 })).toBe(false);
    expect(isProtocolV2ResourceFileValid(binary, { ...identity, fileHash: '0'.repeat(64) })).toBe(
      false
    );
  });

  test('applies a validated pre-release config and exposes the stable resource set', async () => {
    const configFetcher = jest.fn().mockResolvedValue(createRemoteConfig());

    await expect(DataManager.load(createSettings(configFetcher))).resolves.toBe(true);

    expect(configFetcher).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/data\.onekey\.so\/pre-config\.json\?noCache=/)
    );
    expect(DataManager.getProtocolV2Resources()).toEqual(resources);
    expect(DataManager.getProtocolV2BootResources()).toEqual(bootResources);
  });

  test('does not advance the cache timestamp when refresh fails', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('offline'));
    const settings = createSettings(jest.fn().mockResolvedValue(null));
    DataManager.settings = settings;

    await DataManager.checkAndReloadData();

    expect(DataManager.lastCheckTimestamp).toBe(0);
    await expect(DataManager.forceReloadData()).rejects.toThrow(
      'Unable to refresh the latest remote config'
    );
    expect(DataManager.lastCheckTimestamp).toBe(0);
  });
});
