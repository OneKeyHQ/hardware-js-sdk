import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import GetDeviceState from '../src/api/GetDeviceState';
import RefreshDeviceState from '../src/api/RefreshDeviceState';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('device state read and refresh operations', () => {
  test('public getDeviceState ignores refresh and raw payload controls', async () => {
    const getDeviceState = jest.fn().mockResolvedValue({ revision: 1 });
    const method = new GetDeviceState({
      id: 1,
      payload: {
        method: 'getDeviceState',
        refresh: ['status'],
        includeRaw: true,
      },
    });
    method.init();
    (method as any).device = { getDeviceState };

    await method.run();

    expect(getDeviceState).toHaveBeenCalledWith();
  });

  test.each([
    ['basic', ['identity', 'versions']],
    ['firmware', ['identity', 'versions', 'verification']],
    ['settings', ['settings']],
    ['runtime', ['status']],
  ] as const)('maps the %s scope to internal refresh sections', async (scope, refreshSections) => {
    const getDeviceState = jest.fn().mockResolvedValue({ revision: 2 });
    const method = new RefreshDeviceState({
      id: 1,
      payload: { method: 'refreshDeviceState', scope },
    });
    method.init();
    (method as any).device = {
      state: { status: { mode: 'normal' } },
      getDeviceState,
    };

    await method.run();

    expect(getDeviceState).toHaveBeenCalledWith({ refreshSections: [...refreshSections] });
  });

  test.each(['bootloader', 'romloader'] as const)(
    'rejects runtime refresh in %s mode instead of returning stale state',
    async mode => {
      const getDeviceState = jest.fn();
      const method = new RefreshDeviceState({
        id: 1,
        payload: { method: 'refreshDeviceState', scope: 'runtime' },
      });
      method.init();
      (method as any).device = {
        state: { status: { mode } },
        getCurrentFirmwareType: () => 'universal',
        getDeviceState,
      };

      await expect(method.run()).rejects.toMatchObject({
        errorCode: HardwareErrorCode.DeviceNotSupportMethod,
      });
      expect(getDeviceState).not.toHaveBeenCalled();
    }
  );

  test('initializes the minimal state before checking a runtime refresh mode', async () => {
    let state: { status: { mode: string } } | undefined;
    const getDeviceState = jest.fn().mockImplementation(async params => {
      if (!params) {
        state = { status: { mode: 'normal' } };
      }
      return { revision: params ? 2 : 1 };
    });
    const method = new RefreshDeviceState({
      id: 1,
      payload: { method: 'refreshDeviceState', scope: 'runtime' },
    });
    method.init();
    (method as any).device = {
      get state() {
        return state;
      },
      getCurrentFirmwareType: () => 'universal',
      getDeviceState,
    };

    await method.run();

    expect(getDeviceState).toHaveBeenNthCalledWith(1);
    expect(getDeviceState).toHaveBeenNthCalledWith(2, {
      refreshSections: ['status'],
    });
  });

  test('rejects an unknown runtime scope', () => {
    const method = new RefreshDeviceState({
      id: 1,
      payload: { method: 'refreshDeviceState', scope: 'unknown' as any },
    });

    expect(() => method.init()).toThrow();
  });
});
