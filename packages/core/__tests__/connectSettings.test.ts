import {
  DEFAULT_FIRMWARE_MANIFEST_CONFIG_SRC,
  PRE_RELEASE_FIRMWARE_MANIFEST_CONFIG_SRC,
  parseConnectSettings,
  resolveFirmwareManifestMode,
} from '../src/data-manager/connectSettings';

import type { ConnectSettings } from '../src/types';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('connect settings legacy firmware config behavior', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete global.ONEKEY_CONNECT_SRC;
  });

  it('keeps only a truthy fetchConfig input', () => {
    expect(parseConnectSettings({ fetchConfig: true })).toEqual(
      expect.objectContaining({
        fetchConfig: true,
      })
    );
    expect(parseConnectSettings({ fetchConfig: false })).not.toHaveProperty('fetchConfig');
    expect(parseConnectSettings()).not.toHaveProperty('fetchConfig');
  });

  it('ignores the removed configFetcher field from untyped migration input', () => {
    const settings = parseConnectSettings({
      fetchConfig: true,
      configFetcher: jest.fn(),
    } as unknown as Partial<ConnectSettings>);

    expect(settings.fetchConfig).toBe(true);
    expect(settings).not.toHaveProperty('configFetcher');
  });

  it('copies an explicit firmware manifest mode through the public settings parser', () => {
    const firmwareManifestMode = {
      kind: 'sdk-managed',
      configSrc: 'https://firmware.example.com/config.json',
    } as const;

    const settings = parseConnectSettings({
      fetchConfig: true,
      firmwareManifestMode,
    });

    expect(settings.firmwareManifestMode).toEqual(firmwareManifestMode);
    expect(resolveFirmwareManifestMode(settings)).toEqual(firmwareManifestMode);
  });

  it.each([
    {
      input: { fetchConfig: true },
      expected: {
        kind: 'sdk-managed',
        configSrc: DEFAULT_FIRMWARE_MANIFEST_CONFIG_SRC,
      },
    },
    {
      input: { fetchConfig: false },
      expected: { kind: 'sdk-managed' },
    },
    {
      input: {},
      expected: { kind: 'sdk-managed' },
    },
    {
      input: { fetchConfig: true, preRelease: true },
      expected: {
        kind: 'sdk-managed',
        configSrc: PRE_RELEASE_FIRMWARE_MANIFEST_CONFIG_SRC,
      },
    },
  ])('maps legacy config input $input to its manifest mode', ({ input, expected }) => {
    expect(resolveFirmwareManifestMode(input)).toEqual(expected);
  });
});
