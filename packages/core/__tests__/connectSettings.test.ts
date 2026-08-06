import DataManager from '../src/data-manager/DataManager';
import { parseConnectSettings } from '../src/data-manager/connectSettings';

import type { RemoteConfigResponse } from '../src/types';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const mockAxiosGet: jest.Mock = jest.requireMock('axios').get;

describe('parseConnectSettings', () => {
  const preloadedConfig = {
    bridge: {},
    classic: { firmware: [], ble: [] },
    classic1s: { firmware: [], ble: [] },
    classicpure: { firmware: [], ble: [] },
    mini: { firmware: [], ble: [] },
    touch: { firmware: [], ble: [] },
    pro: { firmware: [], ble: [] },
    pro2: { firmware: [], ble: [] },
  } as unknown as RemoteConfigResponse;

  it('keeps a serializable preloaded config in parsed settings', () => {
    const settings = parseConnectSettings({
      firmwareManifestMode: 'sdk-managed',
      preloadedConfig,
    });

    expect(settings.firmwareManifestMode).toBe('sdk-managed');
    expect(settings.preloadedConfig).toBe(preloadedConfig);
  });

  it('uses the preloaded config before the SDK network client', async () => {
    const settings = parseConnectSettings({
      firmwareManifestMode: 'sdk-managed',
      preloadedConfig,
    });

    await DataManager.load(settings);

    expect(mockAxiosGet).not.toHaveBeenCalled();
    expect(DataManager.deviceMap.classic).toEqual({ firmware: [], ble: [] });
  });

  it('keeps the SDK offline and available without an external manifest snapshot', async () => {
    const settings = parseConnectSettings({
      firmwareManifestMode: 'external-only',
    });

    await expect(DataManager.load(settings)).resolves.toBe(false);
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });
});
