import { EFirmwareType } from '@onekeyfe/hd-shared';

import CheckAllFirmwareRelease, {
  buildProtocolV2FirmwareRelease,
} from '../src/api/CheckAllFirmwareRelease';
import { DataManager } from '../src/data-manager';
import { createCoreApi } from '../src/inject';
import { PROTOCOL_V2_RESOURCE_DEVICE_PATHS } from '../src/protocols/protocol-v2/resources';

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
    },
    applicationP1: {
      target: 'APPLICATION_P1',
      url: 'https://example.com/application-p1.bin',
      version: [2, 0, 0],
    },
    se02: {
      target: 'SE02',
      url: 'https://example.com/se02.bin',
      version: [2, 0, 0],
    },
    se03: {
      target: 'SE03',
      url: 'https://example.com/se03.bin',
      version: [1, 0, 0],
    },
    romloader: {
      target: 'ROMLOADER',
      url: 'https://example.com/romloader.bin',
      version: [2, 0, 0],
    },
  },
  resourceBundles: [
    {
      name: 'images',
      url: 'https://example.com/images.okpkg',
      devicePath: 'vol0:/bundles/images/images.okpkg',
      version: [1, 0, 0],
    },
  ],
};

const stableResources = ['images', 'animation', 'wallpaper', 'translations', 'roobert', 'noto'].map(
  (type, index) => ({
    type,
    url: `https://example.com/${type}.okpkg`,
    size: 0x52a0 + index + 1,
    fileHash: 'a'.repeat(64),
    headerHash: index.toString(16).padStart(128, '0'),
  })
);

const createFilesystemTypedCall = (missingAll = false) => {
  const resourceByPath = new Map(
    stableResources.map(resource => [
      PROTOCOL_V2_RESOURCE_DEVICE_PATHS[
        resource.type as keyof typeof PROTOCOL_V2_RESOURCE_DEVICE_PATHS
      ],
      resource,
    ])
  );
  return jest.fn((requestType: string, _responseType: string, payload: Record<string, any>) => {
    if (requestType === 'ResourceInventoryGet') {
      throw new Error('ResourceInventoryGet is unavailable on released firmware');
    }
    if (requestType === 'FilesystemPathInfoQuery') {
      const resource = resourceByPath.get(payload.path);
      return {
        message: {
          exist: Boolean(resource) && !missingAll,
          directory: false,
          size: missingAll ? 0 : resource?.size,
        },
      };
    }
    if (requestType === 'FilesystemFileRead') {
      const resource = resourceByPath.get(payload.file.path);
      if (!resource || missingAll) throw new Error('missing resource');
      const header = new Uint8Array(0x52a0);
      const view = new DataView(header.buffer);
      'OKPP'.split('').forEach((char, index) => {
        header[index] = char.charCodeAt(0);
      });
      'RESC'.split('').forEach((char, index) => {
        header[0x08 + index] = char.charCodeAt(0);
      });
      view.setUint32(0x0c, header.byteLength, true);
      for (let index = 0; index < resource.headerHash.length / 2; index++) {
        header[0x240 + index] = Number.parseInt(
          resource.headerHash.slice(index * 2, index * 2 + 2),
          16
        );
      }
      const offset = Number(payload.file.offset);
      const chunkLength = Number(payload.chunk_len);
      return {
        message: {
          data: header.slice(offset, offset + chunkLength),
        },
      };
    }
    throw new Error(`Unexpected request: ${requestType}`);
  });
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
      resourceBundles: undefined,
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

  test('keeps same-version hash-aware components unknown without metadata payloadHash', () => {
    const packageSet: IFirmwareReleaseInfo = {
      ...release,
      required: false,
      resourceBundles: undefined,
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
      resourceBundles: undefined,
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
    const typedCall = createFilesystemTypedCall(true);
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
    jest.spyOn(DataManager, 'getProtocolV2Resources').mockReturnValue(stableResources as any);

    await expect(method.run()).resolves.toMatchObject({
      protocol: 'V2',
      deviceType: 'pro2',
      status: 'required',
      resourceStatus: 'unknown',
      targetsToUpdate: ['boot', 'app_v1'],
      firmware: {
        status: 'required',
      },
    });
    expect(typedCall).not.toHaveBeenCalled();
    expect(method.getSupportedProtocols()).toEqual(['V1', 'V2']);
  });

  test.each(['bootloader', 'romloader'] as const)(
    'uses filesystem inventory in %s mode instead of forcing all resources',
    async mode => {
      const method = new CheckAllFirmwareRelease({
        id: 1,
        payload: {
          method: 'checkAllFirmwareRelease',
          firmwareType: EFirmwareType.Universal,
        },
      });
      method.init();
      const typedCall = createFilesystemTypedCall();
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
      jest.spyOn(DataManager, 'getProtocolV2Resources').mockReturnValue(stableResources as any);

      await expect(method.run()).resolves.toMatchObject({
        protocol: 'V2',
        resourceStatus: 'valid',
        targetsToUpdate: ['boot', 'app_v1'],
      });
      expect(typedCall.mock.calls.some(call => call[0] === 'ResourceInventoryGet')).toBe(false);
      expect(typedCall.mock.calls.some(call => call[0] === 'FilesystemFileRead')).toBe(true);
    }
  );

  test('continues forwarding the existing public method', async () => {
    const call = jest.fn().mockResolvedValue({ success: true, payload: {} });
    const api = createCoreApi(call as CoreApi['call']) as CoreApi;

    await api.checkAllFirmwareRelease('pro2-connect-id', {
      firmwareType: EFirmwareType.Universal,
      retryCount: 0,
    });

    expect(call).toHaveBeenCalledWith({
      connectId: 'pro2-connect-id',
      firmwareType: EFirmwareType.Universal,
      retryCount: 0,
      method: 'checkAllFirmwareRelease',
    });
    expect(api).not.toHaveProperty('checkAllFirmwareReleaseV4');
  });
});
