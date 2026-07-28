import { EFirmwareType, HardwareErrorCode } from '@onekeyfe/hd-shared';

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
    expect(api).not.toHaveProperty('deviceInfoGet');
    expect(api).not.toHaveProperty('deviceStatusGet');
    expect(api).not.toHaveProperty('deviceSettingsGet');
    expect(api).not.toHaveProperty('deviceSessionOpen');
    expect(api).not.toHaveProperty('deviceSettingsSet');
    expect(api).not.toHaveProperty('deviceSettingsPageShow');
    expect(api).not.toHaveProperty('deviceFirmwareUpdate');
    expect(api).not.toHaveProperty('deviceGetFirmwareUpdateStatus');
    expect(api).not.toHaveProperty('deviceFactoryInfoSet');
    expect(api).not.toHaveProperty('deviceFactoryInfoGet');
    expect(api).not.toHaveProperty('filesystemPermissionFix');
    expect(api).not.toHaveProperty('filesystemFormat');
    expect(api).not.toHaveProperty('fileRead');
    expect(api).not.toHaveProperty('fileWrite');
    expect(api).not.toHaveProperty('fileDelete');
    expect(api).not.toHaveProperty('dirRemove');
    expect(api).not.toHaveProperty('filesystemFileRead');
    expect(api).not.toHaveProperty('filesystemDirList');

    expect(publicMethods).not.toHaveProperty('getDeviceInfo');
    expect(publicMethods).not.toHaveProperty('deviceInfoGet');
    expect(publicMethods).not.toHaveProperty('deviceStatusGet');
    expect(publicMethods).not.toHaveProperty('deviceSettingsGet');
    expect(publicMethods).not.toHaveProperty('deviceSessionOpen');
    expect(publicMethods).not.toHaveProperty('deviceSettingsSet');
    expect(publicMethods).not.toHaveProperty('deviceSettingsPageShow');
    expect(publicMethods).not.toHaveProperty('filesystemPermissionFix');
    expect(publicMethods).not.toHaveProperty('filesystemFormat');
    expect(publicMethods).not.toHaveProperty('fileRead');
    expect(publicMethods).not.toHaveProperty('fileWrite');
    expect(publicMethods).not.toHaveProperty('fileDelete');
    expect(publicMethods).not.toHaveProperty('dirRemove');
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

  test.each([
    'deviceFirmwareUpdate',
    'deviceFactoryInfoSet',
    'filesystemPermissionFix',
    'filesystemFormat',
    'deviceInfoGet',
    'deviceStatusGet',
    'protocolInfoRequest',
    'ping',
    'deviceGetFirmwareUpdateStatus',
    'deviceFactoryInfoGet',
    'fileRead',
    'dirList',
    'dirMake',
    'pathInfo',
    'fileWrite',
    'fileDelete',
    'dirRemove',
  ])('rejects removed privileged method %s', name => {
    expect(() =>
      findMethod({
        id: 1,
        payload: { method: name },
      } as any)
    ).toThrow(`Method ${name} is not set`);
  });

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

  test('declares getFeatures unsupported on Protocol V2 devices', () => {
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

    expect(() => method.assertProtocolSupported('V2', EFirmwareType.Universal)).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.DeviceNotSupportMethod })
    );
    expect(getDeviceState).not.toHaveBeenCalled();
  });

  test('declares getOnekeyFeatures unsupported on Protocol V2 devices', () => {
    const typedCall = jest.fn();
    const method = new GetOnekeyFeatures({ id: 1, payload: { method: 'getOnekeyFeatures' } });
    method.init();
    expect(method.unlockPolicy).toBe('none');
    (method as any).device = {
      commands: { typedCall },
      getCurrentFirmwareType: () => 'universal',
      isProtocolV2: () => true,
    };

    expect(() => method.assertProtocolSupported('V2', EFirmwareType.Universal)).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.DeviceNotSupportMethod })
    );
    expect(typedCall).not.toHaveBeenCalled();
  });
});

// These raw Protocol V2 commands are intentionally absent from CoreApi.
// @ts-expect-error getDeviceInfo is not part of the public API
type RemovedGetDeviceInfo = CoreApi['getDeviceInfo'];
// @ts-expect-error deviceInfoGet is not part of the public API
type RemovedDeviceInfoGet = CoreApi['deviceInfoGet'];
// @ts-expect-error deviceStatusGet is not part of the public API
type RemovedDeviceStatusGet = CoreApi['deviceStatusGet'];
// @ts-expect-error protocolInfoRequest is not part of the public API
type RemovedProtocolInfoRequest = CoreApi['protocolInfoRequest'];
// @ts-expect-error ping is not part of the public API
type RemovedPing = CoreApi['ping'];
// @ts-expect-error deviceGetFirmwareUpdateStatus is not part of the public API
type RemovedFirmwareUpdateStatus = CoreApi['deviceGetFirmwareUpdateStatus'];
// @ts-expect-error deviceFactoryInfoGet is not part of the public API
type RemovedFactoryInfoGet = CoreApi['deviceFactoryInfoGet'];
// @ts-expect-error fileRead is not part of the public API
type RemovedFileRead = CoreApi['fileRead'];
// @ts-expect-error dirList is not part of the public API
type RemovedDirList = CoreApi['dirList'];
// @ts-expect-error dirMake is not part of the public API
type RemovedDirMake = CoreApi['dirMake'];
// @ts-expect-error pathInfo is not part of the public API
type RemovedPathInfo = CoreApi['pathInfo'];
// @ts-expect-error deviceSettingsGet is not part of the public API
type RemovedDeviceSettingsGet = CoreApi['deviceSettingsGet'];
// @ts-expect-error deviceSettingsSet is not part of the public API
type RemovedDeviceSettingsSet = CoreApi['deviceSettingsSet'];
// @ts-expect-error deviceSettingsPageShow is not part of the public API
type RemovedDeviceSettingsPageShow = CoreApi['deviceSettingsPageShow'];
// @ts-expect-error refreshDeviceState was replaced by getDeviceState scope
type RemovedRefreshDeviceState = CoreApi['refreshDeviceState'];
