import { Device } from '../src/device/Device';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('preInitialize', () => {
  it('matches pre-initialized state by passphraseState only', () => {
    const device = Object.create(Device.prototype) as Device;

    device.markPreInitialized({
      passphraseState: 'passphrase-state',
    });

    expect(
      device.isPreInitializeMetaMatch({
        passphraseState: 'passphrase-state',
      })
    ).toBe(true);
  });
});
