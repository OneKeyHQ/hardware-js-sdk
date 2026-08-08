import { EFirmwareType } from '@onekeyfe/hd-shared';

import CheckAllFirmwareRelease from '../src/api/CheckAllFirmwareRelease';
import CheckBLEFirmwareRelease from '../src/api/CheckBLEFirmwareRelease';
import CheckBootloaderRelease from '../src/api/CheckBootloaderRelease';
import CheckFirmwareRelease from '../src/api/CheckFirmwareRelease';
import { DataManager } from '../src/data-manager';

import type { IFirmwareReleaseInfo } from '../src/types';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const release: IFirmwareReleaseInfo = {
  required: false,
  version: [2, 0, 0],
  url: 'https://example.com/application-p1.okpkg',
  fingerprint: 'release-fingerprint',
  changelog: {
    'zh-CN': '更新',
    'en-US': 'Update',
  },
  bootloaderChangelog: {
    'zh-CN': '旧版 Bootloader 更新',
    'en-US': 'Legacy bootloader update',
  },
  installOrder: ['bootloader', 'applicationP1', 'coprocessor'],
  components: {
    bootloader: {
      target: 'BOOTLOADER',
      url: 'https://example.com/bootloader.okpkg',
      version: [2, 0, 0],
    },
    applicationP1: {
      target: 'APPLICATION_P1',
      url: 'https://example.com/application-p1.okpkg',
      version: [2, 0, 0],
    },
    coprocessor: {
      target: 'COPROCESSOR',
      url: 'https://example.com/coprocessor.okpkg',
      version: [2, 0, 0],
    },
  },
};

const createDevice = (deviceType: 'pro2' | 'neo') => ({
  isProtocolV2: () => true,
  features: {
    deviceType,
    firmwareVersion: '1.0.0',
  },
  getDeviceState: jest.fn().mockResolvedValue({
    identity: {
      deviceType,
      firmwareType: EFirmwareType.Universal,
    },
    status: { mode: 'normal' },
    versions: {
      firmware: '1.0.0',
      applicationP1: '1.0.0',
      bootloader: '1.0.0',
      board: '1.0.0',
      ble: '1.0.0',
    },
  }),
});

describe.each(['pro2', 'neo'] as const)('Protocol V2 release checks for %s', deviceType => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('supports firmware, BLE, bootloader, and aggregate release checks', async () => {
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(release);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue({
      archiveUrl: `https://example.com/${deviceType}/pro2-resource.zip`,
      archiveSha256: 'a'.repeat(64),
      archiveSize: 16_815_479,
    });

    const firmwareMethod = new CheckFirmwareRelease({
      id: 1,
      payload: { method: 'checkFirmwareRelease' },
    });
    firmwareMethod.init();
    firmwareMethod.device = createDevice(deviceType) as unknown as CheckFirmwareRelease['device'];

    const bleMethod = new CheckBLEFirmwareRelease({
      id: 2,
      payload: { method: 'checkBLEFirmwareRelease' },
    });
    bleMethod.init();
    bleMethod.device = createDevice(deviceType) as unknown as CheckBLEFirmwareRelease['device'];

    const bootloaderMethod = new CheckBootloaderRelease({
      id: 3,
      payload: { method: 'checkBootloaderRelease' },
    });
    bootloaderMethod.init();
    bootloaderMethod.device = createDevice(
      deviceType
    ) as unknown as CheckBootloaderRelease['device'];

    const allMethod = new CheckAllFirmwareRelease({
      id: 4,
      payload: { method: 'checkAllFirmwareRelease' },
    });
    allMethod.init();
    allMethod.device = createDevice(deviceType) as unknown as CheckAllFirmwareRelease['device'];

    await expect(firmwareMethod.run()).resolves.toMatchObject({
      status: 'outdated',
      shouldUpdate: true,
      release,
    });
    await expect(bleMethod.run()).resolves.toMatchObject({
      status: 'outdated',
      shouldUpdate: true,
      release: {
        protocol: 'V2',
        configKey: 'coprocessor',
        componentTarget: 'COPROCESSOR',
        target: 'COPROCESSOR',
        url: 'https://example.com/coprocessor.okpkg',
        version: [2, 0, 0],
      },
    });
    await expect(bootloaderMethod.run()).resolves.toMatchObject({
      status: 'outdated',
      shouldUpdate: true,
      changelog: [release.changelog],
      release: {
        protocol: 'V2',
        configKey: 'bootloader',
        componentTarget: 'BOOTLOADER',
        target: 'BOOTLOADER',
        url: 'https://example.com/bootloader.okpkg',
        version: [2, 0, 0],
        changelog: release.changelog,
      },
    });
    await expect(allMethod.run()).resolves.toMatchObject({
      protocol: 'V2',
      deviceType,
      status: 'outdated',
      hasUpgrade: true,
      targetsToUpdate: ['boot', 'app_v1', 'coprocessor'],
      firmware: { status: 'outdated', shouldUpdate: true },
      ble: {
        status: 'outdated',
        shouldUpdate: true,
        release: { componentTarget: 'COPROCESSOR' },
      },
      bootloader: {
        status: 'outdated',
        shouldUpdate: true,
        release: { componentTarget: 'BOOTLOADER' },
      },
    });

    expect(firmwareMethod.getSupportedProtocols()).toEqual(['V1', 'V2']);
    expect(bleMethod.getSupportedProtocols()).toEqual(['V1', 'V2']);
    expect(bootloaderMethod.getSupportedProtocols()).toEqual(['V1', 'V2']);
    expect(allMethod.getSupportedProtocols()).toEqual(['V1', 'V2']);
  });
});

test('returns null from optional release probes when device features are unavailable', async () => {
  const deviceWithoutFeatures = {
    isProtocolV2: jest.fn(() => true),
    features: undefined,
    getDeviceState: jest.fn(),
  };
  const firmwareMethod = new CheckFirmwareRelease({
    id: 1,
    payload: { method: 'checkFirmwareRelease' },
  });
  const bleMethod = new CheckBLEFirmwareRelease({
    id: 2,
    payload: { method: 'checkBLEFirmwareRelease' },
  });
  const bootloaderMethod = new CheckBootloaderRelease({
    id: 3,
    payload: { method: 'checkBootloaderRelease' },
  });

  firmwareMethod.device = deviceWithoutFeatures as unknown as CheckFirmwareRelease['device'];
  bleMethod.device = deviceWithoutFeatures as unknown as CheckBLEFirmwareRelease['device'];
  bootloaderMethod.device = deviceWithoutFeatures as unknown as CheckBootloaderRelease['device'];

  await expect(firmwareMethod.run()).resolves.toBeNull();
  await expect(bleMethod.run()).resolves.toBeNull();
  await expect(bootloaderMethod.run()).resolves.toBeNull();
  expect(deviceWithoutFeatures.isProtocolV2).not.toHaveBeenCalled();
  expect(deviceWithoutFeatures.getDeviceState).not.toHaveBeenCalled();
});
