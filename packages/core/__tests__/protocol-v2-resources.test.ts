import axios from 'axios';
import { EDeviceType, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DataManager } from '../src/data-manager';
import {
  parseProtocolV2ResourcePackage,
  parseProtocolV2Resources,
} from '../src/protocols/protocol-v2/resources';

import type { ConnectSettings, RemoteConfigResponse } from '../src/types';

jest.mock('axios');
jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

const resourceSource = {
  archiveUrl: 'https://example.com/resource/pro2-resource.zip',
  archiveSha256: 'a'.repeat(64),
  archiveSize: 16_815_479,
};

const neoResourceSource = {
  archiveUrl: 'https://example.com/resource/neo-resource.zip',
  archiveSha256: 'b'.repeat(64),
  archiveSize: 12_345_678,
};

const createResourcePackage = (devicePath: string) => {
  const headerSize = 0x5f90;
  const bytes = new Uint8Array(headerSize + 1);
  bytes.set(new TextEncoder().encode('OKPP'), 0);
  bytes.set(new TextEncoder().encode('RESC'), 0x08);
  bytes.set(new TextEncoder().encode(devicePath), 0x6c);
  const view = new DataView(bytes.buffer);
  view.setUint32(0x04, 1, true);
  view.setUint32(0x0c, headerSize, true);
  view.setUint32(0x10, 0x010203, true);
  view.setUint32(0x14, 1, true);
  bytes.fill(0x11, 0x200, 0x240);
  bytes.fill(0x22, 0x240, 0x280);
  bytes[headerSize] = 0xaa;
  return bytes;
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
    pro2: { firmware: [], ble: [], resources: { source: resourceSource } },
    neo: { firmware: [], ble: [], resources: { source: neoResourceSource } },
    bridge: {},
  } as unknown as RemoteConfigResponse);

describe('Pro2 resource configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DataManager.lastCheckTimestamp = 0;
  });

  test('accepts the release archive source', () => {
    expect(parseProtocolV2Resources({ source: resourceSource })).toEqual({
      source: resourceSource,
    });
  });

  test('reads the version, hashes, and direct device path from a RESC package', () => {
    expect(
      parseProtocolV2ResourcePackage(createResourcePackage('vol0:/bundles/images.okpkg'))
    ).toEqual({
      version: [1, 2, 3],
      payloadLength: 1,
      devicePath: 'vol0:/bundles/images.okpkg',
      payloadHash: '11'.repeat(64),
      headerHash: '22'.repeat(64),
    });
  });

  test('accepts the boot resource staging path and rejects paths outside resource roots', () => {
    expect(
      parseProtocolV2ResourcePackage(
        createResourcePackage('vol0:/loaders/bootloader/boot_resource.okpkg.staging')
      ).devicePath
    ).toBe('vol0:/loaders/bootloader/boot_resource.okpkg.staging');
    expect(() =>
      parseProtocolV2ResourcePackage(createResourcePackage('vol0:/unexpected/images.okpkg'))
    ).toThrow('device path');
  });

  test('rejects missing or malformed release sources', () => {
    expect(() => parseProtocolV2Resources({})).toThrow('source is required');
    expect(() =>
      parseProtocolV2Resources({
        source: {
          ...resourceSource,
          archiveUrl: 'http://example.com/pro2-resource.zip',
        },
      })
    ).toThrow('must use HTTPS');
    expect(() =>
      parseProtocolV2Resources({
        source: { ...resourceSource, archiveSha256: 'invalid' },
      })
    ).toThrow('SHA-256');
    expect(() =>
      parseProtocolV2Resources({
        source: { ...resourceSource, archiveSize: 0 },
      })
    ).toThrow('positive integer');
  });

  test('applies a validated pre-release config and exposes its archive source', async () => {
    const configFetcher = jest.fn().mockResolvedValue(createRemoteConfig());

    await expect(DataManager.load(createSettings(configFetcher))).resolves.toBe(true);

    expect(configFetcher).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/data\.onekey\.so\/pre-config\.json\?noCache=/)
    );
    expect(DataManager.getProtocolV2ResourceSource()).toEqual(resourceSource);
    expect(DataManager.lastCheckTimestamp).toBeGreaterThan(0);
  });

  test('reuses the configuration fetched during SDK initialization for an immediate update', async () => {
    const configFetcher = jest.fn().mockResolvedValue(createRemoteConfig());
    const settings = createSettings(configFetcher);

    await expect(DataManager.load(settings)).resolves.toBe(true);
    await expect(DataManager.forceReloadData({ requireResources: true })).resolves.toBeUndefined();

    expect(configFetcher).toHaveBeenCalledTimes(1);
  });

  test('keeps base SDK initialization available when remote Pro2 resources are invalid', async () => {
    const remoteConfig = createRemoteConfig();
    (remoteConfig.pro2 as { resources?: unknown }).resources = { source: {} };
    const configFetcher = jest.fn().mockResolvedValue(remoteConfig);

    await expect(DataManager.load(createSettings(configFetcher))).resolves.toBe(true);

    expect(DataManager.getProtocolV2ResourceSource()).toBeUndefined();
    expect(DataManager.protocolV2ResourcesConfigError).toBeInstanceOf(Error);
    expect(DataManager.getProtocolV2ResourceSource(EDeviceType.Neo)).toEqual(neoResourceSource);
  });

  test('keeps Pro2 resources available when remote Neo resources are invalid', async () => {
    const remoteConfig = createRemoteConfig();
    (remoteConfig.neo as { resources?: unknown }).resources = { source: {} };
    const configFetcher = jest.fn().mockResolvedValue(remoteConfig);

    await expect(DataManager.load(createSettings(configFetcher))).resolves.toBe(true);

    expect(DataManager.getProtocolV2ResourceSource(EDeviceType.Pro2)).toEqual(resourceSource);
    expect(DataManager.getProtocolV2ResourceSource(EDeviceType.Neo)).toBeUndefined();
    await expect(
      DataManager.forceReloadData({
        requireResources: true,
        resourceDeviceType: EDeviceType.Pro2,
      })
    ).resolves.toBeUndefined();
    await expect(
      DataManager.forceReloadData({
        requireResources: true,
        resourceDeviceType: EDeviceType.Neo,
      })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.FirmwareUpdateDownloadFailed,
      message: expect.stringContaining('Invalid Neo resources config'),
    });
  });

  test('only blocks resource mutation when the refreshed Pro2 resources are invalid', async () => {
    const remoteConfig = createRemoteConfig();
    (remoteConfig.pro2 as { resources?: unknown }).resources = { source: {} };
    const settings = createSettings(jest.fn().mockResolvedValue(remoteConfig));
    DataManager.settings = settings;

    await expect(DataManager.forceReloadData()).resolves.toBeUndefined();
    await expect(DataManager.forceReloadData({ requireResources: true })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.FirmwareUpdateDownloadFailed,
      message: expect.stringContaining('Invalid Pro2 resources config'),
    });
    expect(DataManager.lastCheckTimestamp).toBeGreaterThan(0);
  });

  test('checks resource configuration errors for the requested device only', async () => {
    const remoteConfig = createRemoteConfig();
    (remoteConfig.pro2 as { resources?: unknown }).resources = { source: {} };
    const settings = createSettings(jest.fn().mockResolvedValue(remoteConfig));
    DataManager.settings = settings;

    await expect(
      DataManager.forceReloadData({
        requireResources: true,
        resourceDeviceType: EDeviceType.Neo,
      })
    ).resolves.toBeUndefined();
    await expect(
      DataManager.forceReloadData({
        requireResources: true,
        resourceDeviceType: EDeviceType.Pro2,
      })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.FirmwareUpdateDownloadFailed,
      message: expect.stringContaining('Invalid Pro2 resources config'),
    });
  });

  test('does not advance the cache timestamp when refresh fails', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('offline'));
    const settings = createSettings(jest.fn().mockResolvedValue(null));
    DataManager.settings = settings;

    await DataManager.checkAndReloadData();

    expect(DataManager.lastCheckTimestamp).toBe(0);
    await expect(DataManager.forceReloadData()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.NetworkError,
      message: 'Unable to refresh the latest remote config',
    });
    expect(DataManager.lastCheckTimestamp).toBe(0);
  });
});
