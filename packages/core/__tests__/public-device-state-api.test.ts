import * as publicMethods from '../src/api';
import GetFeatures from '../src/api/GetFeatures';
import GetOnekeyFeatures from '../src/api/GetOnekeyFeatures';
import DeviceInfoGet from '../src/api/protocol-v2/DeviceInfoGet';
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
  test('exposes canonical device state operations without raw settings methods', () => {
    const api = createCoreApi(jest.fn() as CoreApi['call']) as Record<string, unknown>;

    expect(api.getDeviceState).toBeInstanceOf(Function);
    expect(api.getPassphraseState).toBeInstanceOf(Function);
    expect(api.openWalletSession).toBeInstanceOf(Function);
    expect(api.clearSessionCache).toBeInstanceOf(Function);
    expect(api.deviceGetOnboardingStatus).toBeInstanceOf(Function);
    expect(api.uploadPortfolio).toBeInstanceOf(Function);
    expect(api).not.toHaveProperty('refreshDeviceState');
    expect(api.getFeatures).toBeInstanceOf(Function);
    expect(api.getOnekeyFeatures).toBeInstanceOf(Function);
    expect(api).not.toHaveProperty('getDeviceInfo');
    expect(api.deviceInfoGet).toBeInstanceOf(Function);
    expect(api.deviceStatusGet).toBeInstanceOf(Function);
    expect(api).not.toHaveProperty('deviceSettingsGet');
    expect(api).not.toHaveProperty('deviceSessionOpen');
    expect(api).not.toHaveProperty('deviceSettingsSet');
    expect(api).not.toHaveProperty('deviceSettingsPageShow');
    expect(api.deviceFirmwareUpdate).toBeInstanceOf(Function);
    expect(api.deviceGetFirmwareUpdateStatus).toBeInstanceOf(Function);
    expect(api.deviceFactoryInfoSet).toBeInstanceOf(Function);
    expect(api.deviceFactoryInfoGet).toBeInstanceOf(Function);
    expect(api.filesystemPermissionFix).toBeInstanceOf(Function);
    expect(api.filesystemFormat).toBeInstanceOf(Function);
    expect(api.fileRead).toBeInstanceOf(Function);
    expect(api.fileWrite).toBeInstanceOf(Function);
    expect(api).not.toHaveProperty('filesystemFileRead');
    expect(api).not.toHaveProperty('filesystemDirList');

    expect(publicMethods).not.toHaveProperty('getDeviceInfo');
    expect(publicMethods).toHaveProperty('deviceInfoGet');
    expect(publicMethods).toHaveProperty('deviceStatusGet');
    expect(publicMethods).not.toHaveProperty('deviceSettingsGet');
    expect(publicMethods).not.toHaveProperty('deviceSessionOpen');
    expect(publicMethods).not.toHaveProperty('deviceSettingsSet');
    expect(publicMethods).not.toHaveProperty('deviceSettingsPageShow');
    expect(publicMethods).toHaveProperty('filesystemPermissionFix');
    expect(publicMethods).toHaveProperty('filesystemFormat');
    expect(publicMethods).toHaveProperty('fileRead');
    expect(publicMethods).toHaveProperty('fileWrite');
    expect(publicMethods).not.toHaveProperty('filesystemFileRead');
  });

  test('forwards the V1 compatibility API and the explicit V2 wallet session API', async () => {
    const call = jest.fn().mockResolvedValue({ success: true, payload: {} });
    const api = createCoreApi(call as CoreApi['call']) as CoreApi;

    await api.getPassphraseState('device-1', {
      initSession: true,
      useEmptyPassphrase: false,
    });
    await api.openWalletSession('device-2', {
      mode: 'resume-hidden',
      deviceId: 'wallet-device-1',
      passphraseState: 'wallet-state-1',
    });
    await api.clearSessionCache({
      deviceId: 'wallet-device-1',
      passphraseState: 'wallet-state-1',
    });

    expect(call).toHaveBeenNthCalledWith(1, {
      connectId: 'device-1',
      initSession: true,
      useEmptyPassphrase: false,
      method: 'getPassphraseState',
    });
    expect(call).toHaveBeenNthCalledWith(2, {
      connectId: 'device-2',
      mode: 'resume-hidden',
      deviceId: 'wallet-device-1',
      passphraseState: 'wallet-state-1',
      method: 'openWalletSession',
    });
    expect(call).toHaveBeenNthCalledWith(3, {
      deviceId: 'wallet-device-1',
      passphraseState: 'wallet-state-1',
      method: 'clearSessionCache',
    });
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
  });

  test.each([
    ['deviceInfoGet', DeviceInfoGet],
    ['deviceStatusGet', DeviceStatusGet],
  ])('allows the dispatcher to run the public development method %s', (name, Method) => {
    const instance = findMethod({
      id: 1,
      payload: { method: name },
    } as any);

    expect(instance).toBeInstanceOf(Method);
  });

  test.each([
    'protocolInfoRequest',
    'ping',
    'deviceFirmwareUpdate',
    'deviceGetFirmwareUpdateStatus',
    'deviceFactoryInfoSet',
    'deviceFactoryInfoGet',
  ])('keeps the public development method %s available to the dispatcher', name => {
    expect(
      findMethod({
        id: 1,
        payload: { method: name },
      } as any)
    ).toBeDefined();
  });

  test.each([
    'deviceSessionOpen',
    'deviceSettingsGet',
    'deviceSettingsSet',
    'deviceSettingsPageShow',
  ])('rejects removed raw method %s', name => {
    expect(() =>
      findMethod({
        id: 1,
        payload: { method: name },
      } as any)
    ).toThrow(`Method ${name} is not set`);
  });

  test.each(['filesystemPermissionFix', 'filesystemFormat'])(
    'keeps the development maintenance method %s available to the dispatcher',
    name => {
      expect(
        findMethod({
          id: 1,
          payload: { method: name },
        } as any)
      ).toBeDefined();
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
// @ts-expect-error deviceSettingsSet 已从公共 API 删除
type RemovedDeviceSettingsSet = CoreApi['deviceSettingsSet'];
// @ts-expect-error deviceSettingsPageShow 已从公共 API 删除
type RemovedDeviceSettingsPageShow = CoreApi['deviceSettingsPageShow'];
// @ts-expect-error refreshDeviceState 已被 getDeviceState scope 取代
type RemovedRefreshDeviceState = CoreApi['refreshDeviceState'];
