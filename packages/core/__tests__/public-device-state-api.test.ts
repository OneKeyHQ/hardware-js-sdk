import * as publicMethods from '../src/api';
import GetFeatures from '../src/api/GetFeatures';
import DeviceInfoGet from '../src/api/protocol-v2/DeviceInfoGet';
import DeviceSettingsGet from '../src/api/protocol-v2/DeviceSettingsGet';
import DeviceStatusGet from '../src/api/protocol-v2/DeviceStatusGet';
import { createEmptyDeviceState } from '../src/device/DeviceStateStore';
import { createCoreApi } from '../src/inject';

import type { CoreApi } from '../src/types/api';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('public device state API boundary', () => {
  test('exposes only the canonical state query and Protocol V1 compatibility query', () => {
    const api = createCoreApi(jest.fn() as CoreApi['call']) as Record<string, unknown>;

    expect(api.getDeviceState).toBeInstanceOf(Function);
    expect(api.getFeatures).toBeInstanceOf(Function);
    expect(api).not.toHaveProperty('getDeviceInfo');
    expect(api).not.toHaveProperty('deviceInfoGet');
    expect(api).not.toHaveProperty('deviceStatusGet');
    expect(api).not.toHaveProperty('deviceSettingsGet');

    expect(publicMethods).not.toHaveProperty('getDeviceInfo');
    expect(publicMethods).not.toHaveProperty('deviceInfoGet');
    expect(publicMethods).not.toHaveProperty('deviceStatusGet');
    expect(publicMethods).not.toHaveProperty('deviceSettingsGet');
  });

  test('keeps Protocol V2 command implementations available inside the SDK', () => {
    expect(DeviceInfoGet).toBeDefined();
    expect(DeviceStatusGet).toBeDefined();
    expect(DeviceSettingsGet).toBeDefined();
  });

  test('projects getFeatures from the canonical state for legacy compatibility', async () => {
    const state = createEmptyDeviceState({
      deviceId: 'device-1',
      serialNo: 'SERIAL-1',
      label: 'Unified',
    });
    const getDeviceState = jest.fn().mockResolvedValue(state);
    const method = new GetFeatures({ id: 1, payload: { method: 'getFeatures' } });
    method.init();
    (method as any).device = { getDeviceState, isBootloader: () => false };

    await expect(method.run()).resolves.toMatchObject({
      deviceId: 'device-1',
      label: 'Unified',
    });
    expect(getDeviceState).toHaveBeenCalledWith({ includeRaw: true });
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
