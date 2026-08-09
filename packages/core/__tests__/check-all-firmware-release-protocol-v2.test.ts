import { EFirmwareType } from '@onekeyfe/hd-shared';

import CheckAllFirmwareRelease, {
  buildProtocolV2FirmwareRelease,
} from '../src/api/CheckAllFirmwareRelease';
import { DataManager } from '../src/data-manager';
import { createCoreApi } from '../src/inject';

import type { CoreApi } from '../src/types/api';
import type { DeviceStateVersions, IFirmwareReleaseInfo } from '../src/types';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const currentVersions: DeviceStateVersions = {
  firmware: '1.0.0',
  bootloader: '1.0.0',
  board: '1.0.0',
  ble: '1.0.0',
  se01: '1.0.0',
  se02: '2.0.0',
  se03: null,
  se04: '1.0.0',
};

const validComponentIntegrity = {
  expectedSize: 1024,
  fingerprint: '1'.repeat(64),
};

const release: IFirmwareReleaseInfo = {
  required: true,
  version: [2, 0, 0],
  url: 'https://example.com/application-p1.bin',
  fingerprint: 'release-fingerprint',
  changelog: {
    'zh-CN': '更新',
    'en-US': 'Update',
  },
  installOrder: ['bootloader', 'applicationP1', 'se02', 'se03', 'romloader'],
  components: {
    bootloader: {
      target: 'BOOTLOADER',
      url: 'https://example.com/bootloader.bin',
      version: [1, 1, 0],
      ...validComponentIntegrity,
    },
    applicationP1: {
      target: 'APPLICATION_P1',
      url: 'https://example.com/application-p1.bin',
      version: [2, 0, 0],
      ...validComponentIntegrity,
    },
    se02: {
      target: 'SE02',
      url: 'https://example.com/se02.bin',
      version: [2, 0, 0],
      ...validComponentIntegrity,
    },
    se03: {
      target: 'SE03',
      url: 'https://example.com/se03.bin',
      version: [1, 0, 0],
      ...validComponentIntegrity,
    },
    romloader: {
      target: 'ROMLOADER',
      url: 'https://example.com/romloader.bin',
      version: [2, 0, 0],
    },
  },
};

const resourceSource = {
  archiveUrl: 'https://example.com/pro2-resource/pro2-resource.zip',
  archiveSha256: 'a'.repeat(64),
  archiveSize: 16_815_479,
};

describe('checkAllFirmwareRelease Protocol V2 support', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('builds ordered firmwareUpdateV4 targets from recommended component versions', () => {
    const result = buildProtocolV2FirmwareRelease({
      currentVersions,
      firmwareType: EFirmwareType.Universal,
      release,
    });

    expect(result).toMatchObject({
      status: 'required',
      hasUpgrade: true,
      required: true,
      targetsToUpdate: ['boot', 'app_v1'],
      components: [
        { configKey: 'bootloader', status: 'outdated', updateTarget: 'boot' },
        { configKey: 'applicationP1', status: 'outdated', updateTarget: 'app_v1' },
        { configKey: 'se02', status: 'valid', updateTarget: 'se02' },
        { configKey: 'se03', status: 'unknown', updateTarget: 'se03' },
        { configKey: 'romloader', status: 'unsupported', updateTarget: null },
      ],
    });
  });

  test('marks SE03 and SE04 as unsupported in a Neo firmware plan', () => {
    const neoRelease: IFirmwareReleaseInfo = {
      ...release,
      installOrder: ['se01', 'se02', 'se03', 'se04'],
      components: {
        se01: { target: 'SE01', url: 'https://example.com/se01.bin', version: [2, 0, 0] },
        se02: { target: 'SE02', url: 'https://example.com/se02.bin', version: [3, 0, 0] },
        se03: { target: 'SE03', url: 'https://example.com/se03.bin', version: [2, 0, 0] },
        se04: { target: 'SE04', url: 'https://example.com/se04.bin', version: [2, 0, 0] },
      },
    };

    const result = buildProtocolV2FirmwareRelease({
      currentVersions,
      firmwareType: EFirmwareType.Universal,
      release: neoRelease,
      deviceType: 'neo',
    });

    expect(result.targetsToUpdate).toEqual(['se01', 'se02']);
    expect(result.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ configKey: 'se03', status: 'unsupported', updateTarget: null }),
        expect.objectContaining({ configKey: 'se04', status: 'unsupported', updateTarget: null }),
      ])
    );
  });

  test('returns an unavailable plan when no Pro2 release is configured', () => {
    expect(
      buildProtocolV2FirmwareRelease({
        currentVersions,
        firmwareType: EFirmwareType.Universal,
        release: undefined,
      })
    ).toMatchObject({
      status: 'unavailable',
      hasUpgrade: false,
      required: false,
      components: [],
      targetsToUpdate: [],
    });
  });

  test('detects same-version package hotfixes by P1 and P2 payload hash', () => {
    const packageSet: IFirmwareReleaseInfo = {
      ...release,
      installOrder: ['applicationP1', 'applicationP2'],
      components: {
        applicationP1: {
          target: 'APPLICATION_P1',
          version: [1, 0, 0],
          url: 'https://example.com/application-p1.okpkg',
          fingerprint: 'file-sha256-p1',
        },
        applicationP2: {
          target: 'APPLICATION_P2',
          version: [1, 0, 0],
          url: 'https://example.com/application-p2.okpkg',
          fingerprint: 'file-sha256-p2',
        },
      },
    };

    const result = buildProtocolV2FirmwareRelease({
      currentVersions: {
        ...currentVersions,
        applicationP1: '1.0.0',
        applicationP2: '1.0.0',
      },
      currentVerification: {
        applicationP1Hash: 'aa'.repeat(32),
        applicationP2Hash: 'bb'.repeat(32),
      },
      checkFirmwareHash: true,
      remotePayloadHashes: {
        applicationP1: 'aa'.repeat(64),
        applicationP2: 'cc'.repeat(64),
      },
      firmwareType: EFirmwareType.Universal,
      release: packageSet,
    });

    expect(result).toMatchObject({
      status: 'required',
      targetsToUpdate: ['app_v2'],
      components: [
        { configKey: 'applicationP1', status: 'valid' },
        { configKey: 'applicationP2', status: 'outdated' },
      ],
    });
  });

  test('uses version-only comparison for same-version packages by default', () => {
    const packageSet: IFirmwareReleaseInfo = {
      ...release,
      required: false,
      installOrder: ['applicationP1'],
      components: {
        applicationP1: {
          target: 'APPLICATION_P1',
          version: [1, 0, 0],
          url: 'https://example.com/application-p1.okpkg',
          payloadHash: 'cc'.repeat(64),
        },
      },
    };

    expect(
      buildProtocolV2FirmwareRelease({
        currentVersions: { ...currentVersions, applicationP1: '1.0.0' },
        currentVerification: { applicationP1Hash: 'aa'.repeat(32) },
        firmwareType: EFirmwareType.Universal,
        release: packageSet,
      })
    ).toMatchObject({
      status: 'valid',
      hasUpgrade: false,
      targetsToUpdate: [],
      components: [{ configKey: 'applicationP1', status: 'valid' }],
    });
  });

  test('keeps same-version hash-aware components unknown without metadata payloadHash', () => {
    const packageSet: IFirmwareReleaseInfo = {
      ...release,
      required: false,
      installOrder: ['applicationP1'],
      components: {
        applicationP1: {
          target: 'APPLICATION_P1',
          version: [1, 0, 0],
          url: 'https://untrusted.example/application-p1.okpkg',
          fingerprint: 'file-sha256-p1',
        },
      },
    };

    expect(
      buildProtocolV2FirmwareRelease({
        currentVersions: { ...currentVersions, applicationP1: '1.0.0' },
        currentVerification: { applicationP1Hash: 'aa'.repeat(32) },
        checkFirmwareHash: true,
        firmwareType: EFirmwareType.Universal,
        release: packageSet,
      })
    ).toMatchObject({
      status: 'unknown',
      hasUpgrade: false,
      targetsToUpdate: [],
      components: [{ configKey: 'applicationP1', status: 'unknown' }],
    });
  });

  test('updates both application packages when normal mode only reports P1', () => {
    const packageSet: IFirmwareReleaseInfo = {
      ...release,
      installOrder: ['applicationP1', 'applicationP2'],
      components: {
        applicationP1: {
          target: 'APPLICATION_P1',
          version: [1, 0, 0],
          url: 'https://example.com/application-p1.okpkg',
          fingerprint: 'file-sha256-p1',
        },
        applicationP2: {
          target: 'APPLICATION_P2',
          version: [1, 0, 0],
          url: 'https://example.com/application-p2.okpkg',
          fingerprint: 'file-sha256-p2',
        },
      },
    };

    const result = buildProtocolV2FirmwareRelease({
      currentVersions,
      currentVerification: { applicationP1Hash: 'aa'.repeat(32) },
      checkFirmwareHash: true,
      remotePayloadHashes: { applicationP1: 'cc'.repeat(64) },
      firmwareType: EFirmwareType.Universal,
      release: packageSet,
    });

    expect(result.targetsToUpdate).toEqual(['app_v1', 'app_v2']);
  });

  test('does not read vol0 resource inventory while Protocol V2 is in Application mode', async () => {
    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        firmwareType: EFirmwareType.Universal,
      },
    });
    method.init();
    const getDeviceState = jest.fn().mockResolvedValue({
      identity: {
        deviceType: 'pro2',
        firmwareType: EFirmwareType.Universal,
      },
      status: { mode: 'normal' },
      versions: currentVersions,
    });
    const typedCall = jest.fn();
    method.device = {
      isProtocolV2: () => true,
      features: {
        deviceType: 'pro2',
        firmwareVersion: '1.0.0',
      },
      getDeviceState,
      getCommands: () => ({ typedCall }),
    } as unknown as CheckAllFirmwareRelease['device'];
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(release);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(resourceSource);

    await expect(method.run()).resolves.toMatchObject({
      protocol: 'V2',
      deviceType: 'pro2',
      status: 'required',
      resourceStatus: 'unknown',
      resourceArchive: resourceSource,
      targetsToUpdate: ['boot', 'app_v1'],
      firmwareUpdatePlan: {
        executor: 'v4',
        platform: 'web',
        artifacts: [
          { artifactId: 'component:boot', target: 'boot' },
          { artifactId: 'component:app_v1', target: 'app_v1' },
        ],
        targetsToUpdate: ['boot', 'app_v1'],
      },
      firmware: {
        status: 'required',
      },
    });
    expect(typedCall).not.toHaveBeenCalled();
    expect(getDeviceState).toHaveBeenCalledWith({
      refreshSections: ['identity', 'versions'],
    });
    expect(method.getSupportedProtocols()).toEqual(['V1', 'V2']);
  });

  test('preserves platform and forced firmware targets in the Protocol V2 prepared plan', async () => {
    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        firmwareType: EFirmwareType.Universal,
        platform: 'native',
        forceUpdateTargets: ['firmware'],
      },
    });
    method.init();
    method.device = {
      isProtocolV2: () => true,
      features: {
        deviceType: 'pro2',
        serialNo: 'pro2-device-id',
        firmwareVersion: '1.0.0',
      },
      getDeviceState: jest.fn().mockResolvedValue({
        identity: { deviceType: 'pro2', firmwareType: EFirmwareType.Universal },
        status: { mode: 'normal' },
        versions: currentVersions,
      }),
    } as unknown as CheckAllFirmwareRelease['device'];
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(release);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(resourceSource);

    await expect(method.run()).resolves.toMatchObject({
      targetsToUpdate: ['boot', 'app_v1', 'se02', 'se03'],
      firmwareUpdatePlan: {
        executor: 'v4',
        deviceIdentity: 'pro2-device-id',
        platform: 'native',
        artifacts: [
          { artifactId: 'component:boot', target: 'boot' },
          { artifactId: 'component:app_v1', target: 'app_v1' },
          { artifactId: 'component:se02', target: 'se02' },
          { artifactId: 'component:se03', target: 'se03' },
        ],
        targetsToUpdate: ['boot', 'app_v1', 'se02', 'se03'],
      },
    });
  });

  test('includes exact Protocol V2 developer force targets in the prepared plan', async () => {
    const currentRelease: IFirmwareReleaseInfo = {
      ...release,
      required: false,
      version: [1, 0, 0],
      installOrder: ['applicationP1', 'coprocessor'],
      components: {
        applicationP1: {
          target: 'APPLICATION_P1',
          url: 'https://example.com/application-p1.okpkg',
          version: [1, 0, 0],
          ...validComponentIntegrity,
        },
        coprocessor: {
          target: 'COPROCESSOR',
          url: 'https://example.com/coprocessor.okpkg',
          version: [1, 0, 0],
          ...validComponentIntegrity,
        },
      },
    };
    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        platform: 'desktop',
        protocolV2ForceUpdateTargets: ['app_v1', 'coprocessor'],
      },
    });
    method.init();
    method.device = {
      isProtocolV2: () => true,
      features: {
        deviceType: 'pro2',
        serialNo: 'pro2-device-id',
        firmwareVersion: '1.0.0',
      },
      getDeviceState: jest.fn().mockResolvedValue({
        identity: { deviceType: 'pro2', firmwareType: EFirmwareType.Universal },
        status: { mode: 'normal' },
        versions: { ...currentVersions, applicationP1: '1.0.0' },
      }),
    } as unknown as CheckAllFirmwareRelease['device'];
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(currentRelease);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(resourceSource);

    await expect(method.run()).resolves.toMatchObject({
      targetsToUpdate: ['app_v1', 'coprocessor'],
      firmwareUpdatePlan: {
        executor: 'v4',
        platform: 'desktop',
        artifacts: [
          { artifactId: 'component:app_v1', target: 'app_v1' },
          { artifactId: 'component:coprocessor', target: 'coprocessor' },
        ],
        targetsToUpdate: ['app_v1', 'coprocessor'],
      },
    });
  });

  test('builds a Desktop V4 prepared update without device identity', async () => {
    const currentRelease: IFirmwareReleaseInfo = {
      ...release,
      required: false,
      version: [1, 0, 0],
      installOrder: ['applicationP1'],
      components: {
        applicationP1: {
          target: 'APPLICATION_P1',
          url: 'https://example.com/application-p1.okpkg',
          version: [1, 0, 0],
          ...validComponentIntegrity,
        },
      },
    };
    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        platform: 'desktop',
        protocolV2ForceUpdateTargets: ['app_v1'],
      },
    });
    method.init();
    method.device = {
      isProtocolV2: () => true,
      features: { deviceType: 'pro2', firmwareVersion: '1.0.0' },
      getDeviceState: jest.fn().mockResolvedValue({
        identity: { deviceType: 'pro2', firmwareType: EFirmwareType.Universal },
        status: { mode: 'normal' },
        versions: { ...currentVersions, applicationP1: '1.0.0' },
      }),
    } as unknown as CheckAllFirmwareRelease['device'];
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(currentRelease);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(resourceSource);

    await expect(method.run()).resolves.toMatchObject({
      firmwareUpdatePlan: {
        executor: 'v4',
        deviceIdentity: 'unavailable',
      },
    });
  });

  test('rejects Neo-only unsupported exact secure-element targets', async () => {
    const neoRelease: IFirmwareReleaseInfo = {
      ...release,
      required: false,
      installOrder: ['se03'],
      components: {
        se03: {
          target: 'SE03',
          url: 'https://example.com/se03.okpkg',
          version: [1, 0, 0],
        },
      },
    };
    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        protocolV2ForceUpdateTargets: ['se03'],
      },
    });
    method.init();
    method.device = {
      isProtocolV2: () => true,
      features: { deviceType: 'neo', firmwareVersion: '1.0.0' },
      getDeviceState: jest.fn().mockResolvedValue({
        identity: { deviceType: 'neo', firmwareType: EFirmwareType.Universal },
        status: { mode: 'normal' },
        versions: currentVersions,
      }),
    } as unknown as CheckAllFirmwareRelease['device'];
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(neoRelease);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(resourceSource);

    await expect(method.run()).rejects.toMatchObject({
      params: { firmwareUpdateCode: 'FirmwarePlanInvalid' },
    });
  });

  test('builds a V4 plan for Neo and excludes unsupported secure elements when forced', async () => {
    const neoRelease: IFirmwareReleaseInfo = {
      ...release,
      installOrder: ['se01', 'se02', 'se03', 'se04'],
      components: {
        se01: {
          target: 'SE01',
          url: 'https://example.com/se01.bin',
          version: [1, 0, 0],
          ...validComponentIntegrity,
        },
        se02: {
          target: 'SE02',
          url: 'https://example.com/se02.bin',
          version: [2, 0, 0],
          ...validComponentIntegrity,
        },
        se03: { target: 'SE03', url: 'https://example.com/se03.bin', version: [1, 0, 0] },
        se04: { target: 'SE04', url: 'https://example.com/se04.bin', version: [1, 0, 0] },
      },
    };
    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        platform: 'native',
        forceUpdateTargets: ['firmware'],
      },
    });
    method.init();
    method.device = {
      isProtocolV2: () => true,
      features: {
        deviceType: 'neo',
        serialNo: 'neo-device-id',
        firmwareVersion: '1.0.0',
      },
      getDeviceState: jest.fn().mockResolvedValue({
        identity: { deviceType: 'neo', firmwareType: EFirmwareType.Universal },
        status: { mode: 'normal' },
        versions: currentVersions,
      }),
    } as unknown as CheckAllFirmwareRelease['device'];
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(neoRelease);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(resourceSource);

    await expect(method.run()).resolves.toMatchObject({
      targetsToUpdate: ['se01', 'se02'],
      firmwareUpdatePlan: {
        executor: 'v4',
        deviceModel: 'neo',
        platform: 'native',
        targetsToUpdate: ['se01', 'se02'],
      },
    });
  });

  test('rejects a forced Protocol V2 resource target without a configured archive', async () => {
    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        forceUpdateTargets: ['resource'],
      },
    });
    method.init();
    method.device = {
      isProtocolV2: () => true,
      features: { deviceType: 'pro2', firmwareVersion: '1.0.0' },
      getDeviceState: jest.fn().mockResolvedValue({
        identity: { deviceType: 'pro2', firmwareType: EFirmwareType.Universal },
        status: { mode: 'normal' },
        versions: currentVersions,
      }),
    } as unknown as CheckAllFirmwareRelease['device'];
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(release);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(undefined);

    await expect(method.run()).rejects.toMatchObject({
      params: { firmwareUpdateCode: 'FirmwarePlanInvalid' },
    });
  });

  test('adds a Protocol V2 resource target only when explicitly forced', async () => {
    const currentRelease: IFirmwareReleaseInfo = {
      ...release,
      required: false,
      installOrder: ['applicationP1'],
      components: {
        applicationP1: {
          target: 'APPLICATION_P1',
          url: 'https://example.com/application-p1.okpkg',
          version: [1, 0, 0],
        },
      },
    };
    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        platform: 'desktop',
        protocolV2ForceUpdateTargets: ['resource'],
      },
    });
    method.init();
    method.device = {
      isProtocolV2: () => true,
      features: {
        deviceType: 'pro2',
        serialNo: 'pro2-device-id',
        firmwareVersion: '1.0.0',
      },
      getDeviceState: jest.fn().mockResolvedValue({
        identity: { deviceType: 'pro2', firmwareType: EFirmwareType.Universal },
        status: { mode: 'normal' },
        versions: { ...currentVersions, applicationP1: '1.0.0' },
      }),
    } as unknown as CheckAllFirmwareRelease['device'];
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(currentRelease);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(resourceSource);

    await expect(method.run()).resolves.toMatchObject({
      status: 'valid',
      hasUpgrade: true,
      targetsToUpdate: ['resource'],
      firmwareUpdatePlan: {
        executor: 'v4',
        platform: 'desktop',
        artifacts: [
          {
            artifactId: 'resource:archive',
            target: 'resource',
            role: 'resourceBundle',
            container: 'zip',
          },
        ],
        targetsToUpdate: ['resource'],
      },
    });
  });

  test('requests and compares firmware hashes only when explicitly enabled', async () => {
    const packageSet: IFirmwareReleaseInfo = {
      ...release,
      required: false,
      installOrder: ['applicationP1'],
      components: {
        applicationP1: {
          target: 'APPLICATION_P1',
          version: [1, 0, 0],
          url: 'https://example.com/application-p1.okpkg',
          payloadHash: 'cc'.repeat(64),
        },
      },
    };
    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        firmwareType: EFirmwareType.Universal,
        checkFirmwareHash: true,
      },
    });
    method.init();
    const getDeviceState = jest.fn().mockResolvedValue({
      identity: { deviceType: 'pro2', firmwareType: EFirmwareType.Universal },
      status: { mode: 'normal' },
      versions: { ...currentVersions, applicationP1: '1.0.0' },
      verification: { applicationP1Hash: 'aa'.repeat(32) },
    });
    method.device = {
      isProtocolV2: () => true,
      features: { deviceType: 'pro2', firmwareVersion: '1.0.0' },
      getDeviceState,
      getCommands: () => ({ typedCall: jest.fn() }),
    } as unknown as CheckAllFirmwareRelease['device'];
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(packageSet);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(undefined);

    await expect(method.run()).resolves.toMatchObject({
      status: 'outdated',
      targetsToUpdate: ['app_v1'],
    });
    expect(getDeviceState).toHaveBeenCalledWith({
      refreshSections: ['identity', 'versions', 'verification'],
    });
  });

  test.each(['bootloader', 'romloader'] as const)(
    'does not read vol0 resource inventory in %s mode',
    async mode => {
      const method = new CheckAllFirmwareRelease({
        id: 1,
        payload: {
          method: 'checkAllFirmwareRelease',
          firmwareType: EFirmwareType.Universal,
        },
      });
      method.init();
      const typedCall = jest.fn();
      method.device = {
        isProtocolV2: () => true,
        features: { deviceType: 'pro2', firmwareVersion: '1.0.0' },
        getDeviceState: jest.fn().mockResolvedValue({
          identity: { deviceType: 'pro2', firmwareType: EFirmwareType.Universal },
          status: { mode },
          versions: currentVersions,
        }),
        getCommands: () => ({ typedCall }),
      } as unknown as CheckAllFirmwareRelease['device'];
      jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(release);
      jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(resourceSource);

      await expect(method.run()).resolves.toMatchObject({
        protocol: 'V2',
        resourceStatus: 'unknown',
        resourceArchive: resourceSource,
        targetsToUpdate: ['boot', 'app_v1'],
      });
      expect(typedCall).not.toHaveBeenCalled();
    }
  );

  test('exposes resource archive availability without reporting an unconfirmed update', async () => {
    const currentRelease: IFirmwareReleaseInfo = {
      ...release,
      required: false,
      installOrder: ['applicationP1'],
      components: {
        applicationP1: {
          target: 'APPLICATION_P1',
          url: 'https://example.com/application-p1.okpkg',
          version: [1, 0, 0],
        },
      },
    };
    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        firmwareType: EFirmwareType.Universal,
      },
    });
    method.init();
    method.device = {
      isProtocolV2: () => true,
      features: { deviceType: 'pro2', firmwareVersion: '1.0.0' },
      getDeviceState: jest.fn().mockResolvedValue({
        identity: { deviceType: 'pro2', firmwareType: EFirmwareType.Universal },
        status: { mode: 'normal' },
        versions: { ...currentVersions, applicationP1: '1.0.0' },
      }),
    } as unknown as CheckAllFirmwareRelease['device'];
    jest.spyOn(DataManager, 'getFirmwareLatestRelease').mockReturnValue(currentRelease);
    jest.spyOn(DataManager, 'getProtocolV2ResourceSource').mockReturnValue(resourceSource);

    await expect(method.run()).resolves.toMatchObject({
      status: 'valid',
      hasUpgrade: false,
      resourceStatus: 'unknown',
      resourceArchive: resourceSource,
      targetsToUpdate: [],
      firmwareUpdatePlan: undefined,
    });
  });

  test('continues forwarding the existing public method', async () => {
    const call = jest.fn().mockResolvedValue({ success: true, payload: {} });
    const api = createCoreApi(call as CoreApi['call']) as CoreApi;

    await api.checkAllFirmwareRelease('pro2-connect-id', {
      checkFirmwareHash: true,
      firmwareType: EFirmwareType.Universal,
      protocolV2ForceUpdateTargets: ['app_v1'],
      retryCount: 0,
    });

    expect(call).toHaveBeenCalledWith({
      connectId: 'pro2-connect-id',
      checkFirmwareHash: true,
      firmwareType: EFirmwareType.Universal,
      protocolV2ForceUpdateTargets: ['app_v1'],
      retryCount: 0,
      method: 'checkAllFirmwareRelease',
    });
    expect(api).not.toHaveProperty('checkAllFirmwareReleaseV4');
  });
});
