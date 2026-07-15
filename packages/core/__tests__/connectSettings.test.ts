import { parseConnectSettings } from '../src/data-manager/connectSettings';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('parseConnectSettings', () => {
  it('keeps custom configFetcher in parsed settings', () => {
    const configFetcher = jest.fn();

    const settings = parseConnectSettings({
      fetchConfig: true,
      configFetcher,
    });

    expect(settings.configFetcher).toBe(configFetcher);
  });
});
