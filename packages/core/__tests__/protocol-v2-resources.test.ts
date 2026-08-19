import axios from 'axios';
import { EDeviceType, EFirmwareType, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DataManager } from '../src/data-manager';
import {
  isProtocolV2ResourceArchiveEntryName,
  parseProtocolV2ResourcePackage,
  parseProtocolV2Resources,
} from '../src/protocols/protocol-v2/resources';

import type { ConnectSettings, Features, RemoteConfigResponse } from '../src/types';

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
    pro2: {
      'firmware-v1': [
        {
          required: false,
          version: [1, 0, 0],
          url: 'https://example.com/pro2.okpkg',
          fingerprint: 'a'.repeat(64),
          changelog: { 'zh-CN': 'Pro2', 'en-US': 'Pro2' },
          resources: { source: resourceSource },
        },
      ],
      ble: [],
    },
    neo: {
      'firmware-v1': [
        {
          required: false,
          version: [1, 0, 0],
          url: 'https://example.com/neo.okpkg',
          fingerprint: 'b'.repeat(64),
          changelog: { 'zh-CN': 'Neo', 'en-US': 'Neo' },
          resources: { source: neoResourceSource },
        },
      ],
      ble: [],
    },
    bridge: {},
  } as unknown as RemoteConfigResponse);

const getProtocolV2Release = (deviceType: EDeviceType.Pro2 | EDeviceType.Neo) =>
  DataManager.deviceMap[deviceType]?.['firmware-v1']?.[0];

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

  test('ignores macOS ZIP metadata that only looks like a resource package', () => {
    expect(
      isProtocolV2ResourceArchiveEntryName('bundles/firmware_logo-pro2-prod_resource-signed.okpkg')
    ).toBe(true);
    expect(
      isProtocolV2ResourceArchiveEntryName(
        '__MACOSX/pro2-prod_resource 2/bundles/._firmware_logo-pro2-prod_resource-signed.okpkg'
      )
    ).toBe(false);
    expect(
      isProtocolV2ResourceArchiveEntryName(
        'bundles/._firmware_logo-pro2-prod_resource-signed.okpkg'
      )
    ).toBe(false);
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

  test('uses the RESC header device path and only rejects malformed paths', () => {
    expect(
      parseProtocolV2ResourcePackage(
        createResourcePackage('vol0:/loaders/bootloader/boot_resource.okpkg.staging')
      ).devicePath
    ).toBe('vol0:/loaders/bootloader/boot_resource.okpkg.staging');
    expect(
      parseProtocolV2ResourcePackage(
        createResourcePackage('vol0:/loaders/bootloader/params.okpkg.staging')
      ).devicePath
    ).toBe('vol0:/loaders/bootloader/params.okpkg.staging');
    expect(
      parseProtocolV2ResourcePackage(createResourcePackage('vol0:/loaders/rom/params.okpkg'))
        .devicePath
    ).toBe('vol0:/loaders/rom/params.okpkg');
    expect(
      parseProtocolV2ResourcePackage(createResourcePackage('vol0:/unexpected/images.okpkg'))
        .devicePath
    ).toBe('vol0:/unexpected/images.okpkg');
    expect(() =>
      parseProtocolV2ResourcePackage(createResourcePackage('vol0:/bundles/../images.okpkg'))
    ).toThrow('device path');
    expect(() =>
      parseProtocolV2ResourcePackage(createResourcePackage('vol0://bundles/images.okpkg'))
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
    expect(DataManager.getProtocolV2ResourceSource(getProtocolV2Release(EDeviceType.Pro2))).toEqual(
      resourceSource
    );
    expect(DataManager.lastCheckTimestamp).toBeGreaterThan(0);
  });

  test('uses the resource archive bound to the selected firmware release', async () => {
    const newerResourceSource = {
      archiveUrl: 'https://example.com/resource/pro2-resource-v2.zip',
      archiveSha256: 'c'.repeat(64),
      archiveSize: 20_000_000,
    };
    const remoteConfig = createRemoteConfig();
    remoteConfig.pro2['firmware-v1']?.push({
      ...remoteConfig.pro2['firmware-v1'][0],
      version: [2, 0, 0],
      resources: { source: newerResourceSource },
    });

    await expect(
      DataManager.load(createSettings(jest.fn().mockResolvedValue(remoteConfig)))
    ).resolves.toBe(true);

    const selectedRelease = DataManager.getFirmwareLatestRelease(
      { deviceType: 'pro2', firmwareVersion: '1.0.0' } as Features,
      EFirmwareType.Universal
    );
    expect(selectedRelease?.version).toEqual([2, 0, 0]);
    expect(DataManager.getProtocolV2ResourceSource(selectedRelease)).toEqual(newerResourceSource);
  });

  test('does not use a device-level Protocol V2 resource archive', async () => {
    const remoteConfig = createRemoteConfig();
    delete remoteConfig.pro2['firmware-v1']?.[0].resources;
    (remoteConfig.pro2 as unknown as { resources: unknown }).resources = {
      source: resourceSource,
    };

    await expect(
      DataManager.load(createSettings(jest.fn().mockResolvedValue(remoteConfig)))
    ).resolves.toBe(true);

    expect(
      DataManager.getProtocolV2ResourceSource(getProtocolV2Release(EDeviceType.Pro2))
    ).toBeUndefined();
  });

  test('does not block the latest release when an older release has invalid resources', async () => {
    const remoteConfig = createRemoteConfig();
    (remoteConfig.pro2['firmware-v1']?.[0] as { resources?: unknown }).resources = { source: {} };
    remoteConfig.pro2['firmware-v1']?.push({
      ...remoteConfig.pro2['firmware-v1'][0],
      version: [2, 0, 0],
      resources: { source: resourceSource },
    });
    const configFetcher = jest.fn().mockResolvedValue(remoteConfig);

    await expect(DataManager.load(createSettings(configFetcher))).resolves.toBe(true);
    await expect(DataManager.forceReloadData({ requireResources: true })).resolves.toBeUndefined();

    const latestRelease = DataManager.deviceMap[EDeviceType.Pro2]?.['firmware-v1']?.[1];
    expect(DataManager.getProtocolV2ResourceSource(latestRelease)).toEqual(resourceSource);
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
    (remoteConfig.pro2['firmware-v1']?.[0] as { resources?: unknown }).resources = { source: {} };
    const configFetcher = jest.fn().mockResolvedValue(remoteConfig);

    await expect(DataManager.load(createSettings(configFetcher))).resolves.toBe(true);

    expect(
      DataManager.getProtocolV2ResourceSource(getProtocolV2Release(EDeviceType.Pro2))
    ).toBeUndefined();
    expect(DataManager.protocolV2ResourcesConfigError).toBeInstanceOf(Error);
    expect(DataManager.getProtocolV2ResourceSource(getProtocolV2Release(EDeviceType.Neo))).toEqual(
      neoResourceSource
    );
  });

  test('keeps Pro2 resources available when remote Neo resources are invalid', async () => {
    const remoteConfig = createRemoteConfig();
    (remoteConfig.neo?.['firmware-v1']?.[0] as { resources?: unknown }).resources = { source: {} };
    const configFetcher = jest.fn().mockResolvedValue(remoteConfig);

    await expect(DataManager.load(createSettings(configFetcher))).resolves.toBe(true);

    expect(DataManager.getProtocolV2ResourceSource(getProtocolV2Release(EDeviceType.Pro2))).toEqual(
      resourceSource
    );
    expect(
      DataManager.getProtocolV2ResourceSource(getProtocolV2Release(EDeviceType.Neo))
    ).toBeUndefined();
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
    (remoteConfig.pro2['firmware-v1']?.[0] as { resources?: unknown }).resources = { source: {} };
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
    (remoteConfig.pro2['firmware-v1']?.[0] as { resources?: unknown }).resources = { source: {} };
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
