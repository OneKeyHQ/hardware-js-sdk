import * as publicMethods from '../src/api';
import GetFeatures from '../src/api/GetFeatures';
import GetOnekeyFeatures from '../src/api/GetOnekeyFeatures';
import DeviceInfoGet from '../src/api/protocol-v2/DeviceInfoGet';
import DeviceSettingsGet from '../src/api/protocol-v2/DeviceSettingsGet';
import DeviceStatusGet from '../src/api/protocol-v2/DeviceStatusGet';
import { createEmptyDeviceState } from '../src/device/DeviceStateStore';
import { findMethod } from '../src/api/utils';
import { createCoreApi } from '../src/inject';

import type { CoreApi } from '../src/types/api';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('public device state API boundary', () => {
  test('exposes one canonical device state operation', () => {
    const api = createCoreApi(jest.fn() as CoreApi['call']) as Record<string, unknown>;

    expect(api.getDeviceState).toBeInstanceOf(Function);
    expect(api).not.toHaveProperty('refreshDeviceState');
    expect(api.getFeatures).toBeInstanceOf(Function);
    expect(api.getOnekeyFeatures).toBeInstanceOf(Function);
    expect(api).not.toHaveProperty('getDeviceInfo');
    expect(api).not.toHaveProperty('deviceInfoGet');
    expect(api).not.toHaveProperty('deviceStatusGet');
    expect(api).not.toHaveProperty('deviceSettingsGet');

    expect(publicMethods).not.toHaveProperty('getDeviceInfo');
    expect(publicMethods).not.toHaveProperty('deviceInfoGet');
    expect(publicMethods).not.toHaveProperty('deviceStatusGet');
    expect(publicMethods).not.toHaveProperty('deviceSettingsGet');
  });

  test('forwards only the semantic scope through getDeviceState', async () => {
    const call = jest.fn().mockResolvedValue({ success: true, payload: {} });
    const api = createCoreApi(call as CoreApi['call']) as CoreApi;

    await api.getDeviceState('device-1');
    await (api.getDeviceState as any)('device-1', {
      scope: 'settings',
      refresh: ['status'],
      includeRaw: true,
    });

    expect(call).toHaveBeenNthCalledWith(1, {
      connectId: 'device-1',
      method: 'getDeviceState',
    });
    expect(call).toHaveBeenNthCalledWith(2, {
      connectId: 'device-1',
      method: 'getDeviceState',
      scope: 'settings',
    });
  });

  test('keeps Protocol V2 command implementations available inside the SDK', () => {
    expect(DeviceInfoGet).toBeDefined();
    expect(DeviceStatusGet).toBeDefined();
    expect(DeviceSettingsGet).toBeDefined();
  });

  test.each([
    ['deviceInfoGet', DeviceInfoGet],
    ['deviceStatusGet', DeviceStatusGet],
    ['deviceSettingsGet', DeviceSettingsGet],
  ])(
    'allows the internal dispatcher to run %s without exposing a CoreApi shortcut',
    (name, Method) => {
      const instance = findMethod({
        id: 1,
        payload: { method: name },
      } as any);

      expect(instance).toBeInstanceOf(Method);
    }
  );

  test('projects getFeatures from the canonical state for Protocol V1 compatibility', async () => {
    const state = createEmptyDeviceState({
      deviceId: 'device-1',
      serialNo: 'SERIAL-1',
      label: 'Unified',
    });
    const getDeviceState = jest.fn().mockResolvedValue(state);
    const method = new GetFeatures({ id: 1, payload: { method: 'getFeatures' } });
    method.init();
    expect(method.unlockPolicy).toBe('none');
    (method as any).device = {
      getDeviceState,
      getCurrentFirmwareType: () => 'universal',
      isBootloader: () => false,
      isProtocolV2: () => false,
    };

    await expect(method.run()).resolves.toMatchObject({
      deviceId: 'device-1',
      label: 'Unified',
    });
    expect(getDeviceState).toHaveBeenCalledWith({
      refreshSections: ['identity'],
      includeRaw: true,
    });
  });

  test('rejects getFeatures for Protocol V2 devices', async () => {
    const getDeviceState = jest.fn();
    const method = new GetFeatures({ id: 1, payload: { method: 'getFeatures' } });
    method.init();
    expect(method.unlockPolicy).toBe('none');
    (method as any).device = {
      getDeviceState,
      getCurrentFirmwareType: () => 'universal',
      isBootloader: () => false,
      isProtocolV2: () => true,
    };

    await expect(method.run()).rejects.toMatchObject({
      errorCode: expect.any(Number),
    });
    expect(getDeviceState).not.toHaveBeenCalled();
  });

  test('rejects getOnekeyFeatures for Protocol V2 devices', async () => {
    const typedCall = jest.fn();
    const method = new GetOnekeyFeatures({ id: 1, payload: { method: 'getOnekeyFeatures' } });
    method.init();
    expect(method.unlockPolicy).toBe('none');
    (method as any).device = {
      commands: { typedCall },
      getCurrentFirmwareType: () => 'universal',
      isProtocolV2: () => true,
    };

    await expect(method.run()).rejects.toMatchObject({
      errorCode: expect.any(Number),
    });
    expect(typedCall).not.toHaveBeenCalled();
  });
});

// 这些临时 Pro2 查询不再属于 CoreApi；若重新暴露，下列断言会产生未使用的 ts-expect-error。
// @ts-expect-error getDeviceInfo 已从公共 API 删除
type RemovedGetDeviceInfo = CoreApi['getDeviceInfo'];
// @ts-expect-error deviceInfoGet 已从公共 API 删除
type RemovedDeviceInfoGet = CoreApi['deviceInfoGet'];
// @ts-expect-error deviceStatusGet 已从公共 API 删除
type RemovedDeviceStatusGet = CoreApi['deviceStatusGet'];
// @ts-expect-error deviceSettingsGet 已从公共 API 删除
type RemovedDeviceSettingsGet = CoreApi['deviceSettingsGet'];
// @ts-expect-error refreshDeviceState 已被 getDeviceState scope 取代
type RemovedRefreshDeviceState = CoreApi['refreshDeviceState'];
