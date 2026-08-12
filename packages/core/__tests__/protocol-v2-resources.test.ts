import axios from 'axios';
import { sha256 } from '@noble/hashes/sha256';
import { EDeviceType, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DataManager } from '../src/data-manager';
import {
  parseProtocolV2ResourceManifest,
  parseProtocolV2Resources,
} from '../src/protocols/protocol-v2/resources';

import type { ConnectSettings, RemoteConfigResponse } from '../src/types';

jest.mock('axios');
jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

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

const manifestFiles = [
  ['bundles/firmware_logo-build.okpkg', 'firmware_logo.okpkg', 'vol0:/bundles/firmware_logo.okpkg'],
  ['bundles/font/noto-build.okpkg', 'noto.okpkg', 'vol0:/bundles/font/noto.okpkg'],
  ['bundles/font/roobert-build.okpkg', 'roobert.okpkg', 'vol0:/bundles/font/roobert.okpkg'],
  [
    'bundles/images/animation-build.okpkg',
    'animation.okpkg',
    'vol0:/bundles/images/animation.okpkg',
  ],
  ['bundles/images/images-build.okpkg', 'images.okpkg', 'vol0:/bundles/images/images.okpkg'],
  [
    'bundles/images/wallpaper-build.okpkg',
    'wallpaper.okpkg',
    'vol0:/bundles/images/wallpaper.okpkg',
  ],
  [
    'bundles/translations/translations-build.okpkg',
    'translations.okpkg',
    'vol0:/bundles/translations/translations.okpkg',
  ],
  [
    'loaders/bootloader/boot_resource-build.okpkg',
    'boot_resource.okpkg',
    'vol0:/loaders/bootloader/boot_resource.okpkg',
  ],
  ['loaders/rom/params-build.okpkg', 'params.okpkg', 'vol0:/loaders/rom/params.okpkg'],
].map(([archive_path, original_name, device_path], index) => {
  const binary = new Uint8Array([index + 1]).buffer;
  return {
    archive_path,
    original_name,
    device_path,
    size: 1,
    sha256: bytesToHex(sha256(new Uint8Array(binary))),
    signed: true,
    sig_algo: device_path.startsWith('vol0:/bundles/') ? 'ed25519' : 'mldsa65',
    payload_version: '1.0.0',
    binary,
  };
});

const resourceManifest = {
  schema: 1,
  artifact_name: 'pro2-resource-build',
  release_name: 'resource-build',
  variant: 'resource',
  commit: 'a'.repeat(40),
  short_sha: 'aaaaaaa',
  timestamp_utc: '20260807_091424',
  core_version: '1.0.0',
  key_set: 'dev',
  device_root: 'vol0:',
  restore_mode: 'bootloader_update',
  trees: [
    { path: 'bundles', device: 'vol0:/bundles' },
    { path: 'loaders/bootloader', device: 'vol0:/loaders/bootloader' },
    { path: 'loaders/rom', device: 'vol0:/loaders/rom' },
  ],
  files: manifestFiles.map(({ binary: _binary, ...file }) => file),
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

  test('accepts the manifest source and the CI schema 1 file set', () => {
    expect(parseProtocolV2Resources({ source: resourceSource })).toEqual({
      source: resourceSource,
    });
    expect(parseProtocolV2ResourceManifest(resourceManifest).files).toHaveLength(9);
  });

  test('uses only the resource file list from a manifest', () => {
    expect(
      parseProtocolV2ResourceManifest({
        files: resourceManifest.files,
      })
    ).toEqual({ files: resourceManifest.files });
  });

  test('rejects missing source and malformed manifest paths', () => {
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
    expect(() =>
      parseProtocolV2ResourceManifest({
        ...resourceManifest,
        files: resourceManifest.files.map((file, index) =>
          index === 0 ? { ...file, archive_path: '../outside.okpkg' } : file
        ),
      })
    ).toThrow('archive_path');
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
