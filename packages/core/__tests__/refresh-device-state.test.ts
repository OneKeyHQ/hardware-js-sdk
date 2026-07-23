import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import GetDeviceState from '../src/api/GetDeviceState';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('live device state reads', () => {
  test('public getDeviceState defaults to a runtime refresh and ignores raw controls', async () => {
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

    expect(getDeviceState).toHaveBeenCalledWith({ refreshSections: ['status'] });
    expect(method.unlockPolicy).toBe('none');
  });

  test.each([
    ['firmware', ['status', 'identity', 'versions', 'verification']],
    ['settings', ['status', 'settings']],
    ['runtime', ['status']],
  ] as const)('maps the %s scope to internal refresh sections', async (scope, refreshSections) => {
    const getDeviceState = jest.fn().mockResolvedValue({
      revision: 2,
      status: { mode: 'normal' },
    });
    const method = new GetDeviceState({
      id: 1,
      payload: { method: 'getDeviceState', scope },
    });
    method.init();
    (method as any).device = {
      isProtocolV2: () => true,
      getDeviceState,
    };

    await method.run();

    expect(getDeviceState).toHaveBeenCalledWith({ refreshSections: [...refreshSections] });
  });

  test.each(['bootloader', 'romloader'] as const)(
    'returns loader state without rejecting the default runtime read in %s mode',
    async mode => {
      const state = { status: { mode } };
      const getDeviceState = jest.fn().mockResolvedValue(state);
      const method = new GetDeviceState({
        id: 1,
        payload: { method: 'getDeviceState' },
      });
      method.init();
      (method as any).device = {
        isProtocolV2: () => true,
        getDeviceState,
      };

      await expect(method.run()).resolves.toBe(state);
      expect(getDeviceState).toHaveBeenCalledWith({ refreshSections: ['status'] });
    }
  );

  test('rejects settings scope in loader mode after minimal mode detection', async () => {
    const getDeviceState = jest.fn().mockResolvedValue({ status: { mode: 'bootloader' } });
    const method = new GetDeviceState({
      id: 1,
      payload: { method: 'getDeviceState', scope: 'settings' },
    });
    method.init();
    (method as any).device = {
      isProtocolV2: () => true,
      getCurrentFirmwareType: () => 'universal',
      getDeviceState,
    };

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotSupportMethod,
    });
    expect(getDeviceState).toHaveBeenCalledWith({ refreshSections: ['status', 'settings'] });
  });

  test('rejects an unknown scope', () => {
    const method = new GetDeviceState({
      id: 1,
      payload: { method: 'getDeviceState', scope: 'unknown' as any },
    });

    expect(() => method.init()).toThrow();
  });
});
