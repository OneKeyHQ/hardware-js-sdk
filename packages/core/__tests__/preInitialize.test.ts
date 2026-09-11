import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { Device } from '../src/device/Device';
import { initCore } from '../src/core';
import { DataManager } from '../src/data-manager';
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

  it('initializes again after repeated invalid PIN responses before the next call', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('desktop-webusb' as never);
    const device = Device.fromDescriptor({
      path: 'CLASSIC_USB',
      protocolType: 'V1',
      commType: 'webusb',
    } as never);
    jest.spyOn(device, 'isUsedHere').mockReturnValue(false);
    jest.spyOn(device, 'acquire').mockResolvedValue(undefined);
    const initialize = jest.spyOn(device, 'initialize').mockResolvedValue(undefined);
    const release = jest.spyOn(device, 'release').mockResolvedValue(undefined);
    device.markPreInitialized();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        device.run(() => Promise.reject(ERRORS.TypedError(HardwareErrorCode.PinInvalid)), {
          skipInitialize: device.isPreInitializedValid(60_000),
        })
      ).rejects.toMatchObject({ errorCode: HardwareErrorCode.PinInvalid });
      await device.waitForRunCleanup();
      expect(device.isPreInitializedValid(60_000)).toBe(false);
    }

    const nextCall = jest.fn().mockResolvedValue(undefined);
    await expect(
      device.run(nextCall, { skipInitialize: device.isPreInitializedValid(60_000) })
    ).resolves.toBeUndefined();
    expect(initialize).toHaveBeenCalledTimes(3);
    expect(nextCall).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(4);
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
