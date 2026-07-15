import { Device } from '../src/device/Device';
import { initCore } from '../src/core';
import PreInitialize from '../src/api/device/PreInitialize';
import { IFRAME } from '../src/events';

import type Core from '../src/core';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('preInitialize', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it('cleans request lifecycle when preInitialize is acknowledged without connectId', async () => {
    const core: Core = initCore();
    const disposeSpy = jest.spyOn(PreInitialize.prototype, 'dispose');

    try {
      const response = await core.handleMessage({
        id: 1001,
        type: IFRAME.CALL,
        payload: {
          method: 'preInitialize',
        },
      } as any);

      expect(response).toMatchObject({
        success: true,
        payload: true,
      });
      expect((core as any).tracingContext.activeRequests.has(1001)).toBe(false);
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    } finally {
      core.dispose();
    }
  });
});
