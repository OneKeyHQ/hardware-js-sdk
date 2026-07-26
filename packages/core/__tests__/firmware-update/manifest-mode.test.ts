import axios from 'axios';
import { EDeviceType, EFirmwareType, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { getBinary, getSysResourceBinary } from '../../src/api/firmware/getBinary';
import { parseConnectSettings } from '../../src/data-manager/connectSettings';
import DataManager from '../../src/data-manager/DataManager';
import { httpRequest } from '../../src/utils/networkUtils';

import type { Features, RemoteConfigResponse } from '../../src/types';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../../src/utils/networkUtils', () => ({
  ...jest.requireActual('../../src/utils/networkUtils'),
  httpRequest: jest.fn(),
}));

const mockedHttpRequest = jest.mocked(httpRequest);
const legacyFirmwareUrl = 'https://firmware.example.com/classic1s/4.0.0.bin';
const emptyDeviceConfig = {
  firmware: [],
  ble: [],
};
const remoteConfig = {
  bridge: {},
  classic: emptyDeviceConfig,
  classic1s: {
    firmware: [],
    'firmware-v8': [
      {
        required: false,
        url: legacyFirmwareUrl,
        fingerprint: '',
        version: [4, 0, 0],
        changelog: {
          'zh-CN': '',
          'en-US': '',
        },
      },
    ],
    ble: [],
  },
  classicpure: emptyDeviceConfig,
  mini: emptyDeviceConfig,
  touch: emptyDeviceConfig,
  pro: emptyDeviceConfig,
  pro2: emptyDeviceConfig,
} as unknown as RemoteConfigResponse;

describe('firmware manifest mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    DataManager.lastCheckTimestamp = 0;
    jest.restoreAllMocks();
  });

  it('forbids SDK manifest and artifact network in external-only mode', async () => {
    const axiosGet = jest.spyOn(axios, 'get');
    const settings = parseConnectSettings({
      fetchConfig: true,
      firmwareManifestMode: { kind: 'external-only' },
    });

    await DataManager.load(settings);

    expect(axiosGet).not.toHaveBeenCalled();
    await expect(
      getBinary({
        features: {} as Features,
        firmwareType: EFirmwareType.Universal,
        updateType: 'firmware',
        version: [4, 0, 0],
      })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.FirmwareArtifactsNotPrepared,
    });
    await expect(
      getSysResourceBinary('https://firmware.example.com/resource.zip')
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.FirmwareArtifactsNotPrepared,
    });
    expect(mockedHttpRequest).not.toHaveBeenCalled();
  });

  it('keeps the legacy SDK-managed config and artifact download path available', async () => {
    const axiosGet = jest.spyOn(axios, 'get').mockResolvedValue({
      data: remoteConfig,
    });
    mockedHttpRequest.mockResolvedValue(new ArrayBuffer(4));
    const configSrc = 'https://firmware.example.com/config.json';

    await DataManager.load(
      parseConnectSettings({
        firmwareManifestMode: {
          kind: 'sdk-managed',
          configSrc,
        },
      })
    );
    expect(DataManager.deviceMap[EDeviceType.Classic1s]['firmware-v8']).toHaveLength(1);
    await expect(
      getBinary({
        features: {
          deviceType: EDeviceType.Classic1s,
        } as Features,
        firmwareType: EFirmwareType.Universal,
        updateType: 'firmware',
        version: [4, 0, 0],
      })
    ).resolves.toMatchObject({
      url: legacyFirmwareUrl,
      binary: expect.any(ArrayBuffer),
    });

    expect(DataManager.getFirmwareManifestMode()).toEqual({
      kind: 'sdk-managed',
      configSrc,
    });
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/firmware\.example\.com\/config\.json\?noCache=\d+$/),
      {
        timeout: 7000,
      }
    );
    expect(mockedHttpRequest).toHaveBeenCalledWith(legacyFirmwareUrl, 'binary', undefined);
  });

  it('keeps the bundled sdk-managed mode offline during initialization', async () => {
    const axiosGet = jest.spyOn(axios, 'get');

    await DataManager.load(parseConnectSettings());

    expect(DataManager.getFirmwareManifestMode()).toEqual({
      kind: 'sdk-managed',
    });
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('deduplicates background config reloads while preserving the synchronous API', async () => {
    let resolveReload: (() => void) | undefined;
    const pendingReload = new Promise<void>(resolve => {
      resolveReload = resolve;
    });
    const load = jest.spyOn(DataManager, 'load').mockReturnValue(pendingReload);
    DataManager.lastCheckTimestamp = 0;

    expect(DataManager.checkAndReloadData()).toBeUndefined();
    expect(DataManager.checkAndReloadData()).toBeUndefined();
    expect(load).toHaveBeenCalledTimes(1);

    resolveReload?.();
    await pendingReload;
    await Promise.resolve();
    expect(DataManager.lastCheckTimestamp).toBeGreaterThan(0);
  });

  it('contains rejected background reloads instead of leaking an unhandled rejection', async () => {
    const load = jest
      .spyOn(DataManager, 'load')
      .mockRejectedValue(new Error('network unavailable'));
    DataManager.lastCheckTimestamp = 0;

    expect(DataManager.checkAndReloadData()).toBeUndefined();
    await Promise.resolve();
    await Promise.resolve();

    expect(load).toHaveBeenCalledTimes(1);
  });
});
