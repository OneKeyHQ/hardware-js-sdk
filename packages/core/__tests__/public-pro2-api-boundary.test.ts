import * as publicMethods from '../src/api';
import { findMethod } from '../src/api/utils';
import { createCoreApi } from '../src/inject';

import type { CoreApi } from '../src/types/api';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const removedRawMethodNames = [
  'deviceInfoGet',
  'deviceStatusGet',
  'protocolInfoRequest',
  'ping',
  'deviceGetFirmwareUpdateStatus',
  'deviceFactoryInfoGet',
  'deviceSettingsGet',
  'deviceSettingsSet',
  'deviceSettingsPageShow',
  'deviceFactoryInfoSet',
  'filesystemFormat',
  'filesystemPermissionFix',
  'deviceFirmwareUpdate',
  'fileRead',
  'fileWrite',
  'fileDelete',
  'dirList',
  'dirMake',
  'dirRemove',
  'pathInfo',
  'testProtocolV2FileWrite',
] as const;

const unpublishedFilesystemAliases = [
  'filesystemFileRead',
  'filesystemFileWrite',
  'filesystemFileDelete',
  'filesystemDirList',
  'filesystemDirMake',
  'filesystemDirRemove',
  'filesystemPathInfoQuery',
] as const;

describe('public Pro2 API boundary', () => {
  test('exposes business APIs without raw device or filesystem commands', () => {
    const api = createCoreApi(jest.fn() as CoreApi['call']) as Record<string, unknown>;

    expect(api.deviceGetOnboardingStatus).toBeInstanceOf(Function);
    expect(api.deviceProvisionFactoryInfo).toBeInstanceOf(Function);
    expect(api.deviceReadFactoryInfo).toBeInstanceOf(Function);
    expect(api.deviceWriteFactoryCertificate).toBeInstanceOf(Function);
    expect(api.deviceReadFactoryCertificate).toBeInstanceOf(Function);
    expect(api.deviceSignFactoryChallenge).toBeInstanceOf(Function);
    expect(api.uploadPortfolio).toBeInstanceOf(Function);
    expect(api.testProtocolV2Ping).toBeInstanceOf(Function);
    expect(publicMethods.testProtocolV2Ping).toBeInstanceOf(Function);

    expect(api).not.toHaveProperty('deviceSessionOpen');
    expect(publicMethods).not.toHaveProperty('deviceSessionOpen');
    removedRawMethodNames.forEach(name => {
      expect(api).not.toHaveProperty(name);
      expect(publicMethods).not.toHaveProperty(name);
    });
    unpublishedFilesystemAliases.forEach(name => {
      expect(api).not.toHaveProperty(name);
      expect(publicMethods).not.toHaveProperty(name);
    });
  });

  test('routes semantic Pro2 factory APIs without publishing raw message names', async () => {
    const call = jest.fn().mockResolvedValue({ success: true, payload: {} });
    const api = createCoreApi(call as CoreApi['call']) as CoreApi;
    const manufactureTime = {
      year: 2026,
      month: 8,
      day: 1,
      hour: 10,
      minute: 20,
      second: 30,
    };

    await api.deviceProvisionFactoryInfo('pro2', {
      version: 1,
      serial_number: 'P2A00000001',
      burn_in_completed: true,
      factory_test_completed: true,
      manufacture_time: manufactureTime,
      connectProtocol: 'V2',
    });
    await api.deviceReadFactoryInfo('pro2', { connectProtocol: 'V2' });
    await api.deviceWriteFactoryCertificate('pro2', {
      certificate: 'aabb',
      privateKey: '11'.repeat(32),
      connectProtocol: 'V2',
    });
    await api.deviceReadFactoryCertificate('pro2', { connectProtocol: 'V2' });
    await api.deviceSignFactoryChallenge('pro2', {
      digest: '22'.repeat(32),
      connectProtocol: 'V2',
    });

    expect(call).toHaveBeenNthCalledWith(1, {
      method: 'deviceProvisionFactoryInfo',
      connectId: 'pro2',
      version: 1,
      serial_number: 'P2A00000001',
      burn_in_completed: true,
      factory_test_completed: true,
      manufacture_time: manufactureTime,
      connectProtocol: 'V2',
    });
    expect(call).toHaveBeenNthCalledWith(2, {
      method: 'deviceReadFactoryInfo',
      connectId: 'pro2',
      connectProtocol: 'V2',
    });
    expect(call).toHaveBeenNthCalledWith(3, {
      method: 'deviceWriteFactoryCertificate',
      connectId: 'pro2',
      certificate: 'aabb',
      privateKey: '11'.repeat(32),
      connectProtocol: 'V2',
    });
    expect(call).toHaveBeenNthCalledWith(4, {
      method: 'deviceReadFactoryCertificate',
      connectId: 'pro2',
      connectProtocol: 'V2',
    });
    expect(call).toHaveBeenNthCalledWith(5, {
      method: 'deviceSignFactoryChallenge',
      connectId: 'pro2',
      digest: '22'.repeat(32),
      connectProtocol: 'V2',
    });
  });

  test('routes the diagnostic Protocol V2 Ping without publishing the raw ping command', async () => {
    const call = jest.fn().mockResolvedValue({ success: true, payload: { message: 'benchmark' } });
    const api = createCoreApi(call as CoreApi['call']) as CoreApi;

    await api.testProtocolV2Ping('connect-id', {
      message: 'benchmark',
      connectProtocol: 'V2',
    });

    expect(call).toHaveBeenCalledWith({
      method: 'testProtocolV2Ping',
      connectId: 'connect-id',
      message: 'benchmark',
      connectProtocol: 'V2',
    });
    expect(api).not.toHaveProperty('ping');
    expect(publicMethods).not.toHaveProperty('ping');
  });

  test('rejects deviceSessionOpen at the SDK dispatcher boundary', () => {
    expect(() =>
      findMethod({
        id: 1,
        payload: { method: 'deviceSessionOpen' },
      } as any)
    ).toThrow('Method deviceSessionOpen is not set');
  });

  test.each(removedRawMethodNames)(
    'rejects removed raw method %s at the SDK dispatcher boundary',
    name => {
      expect(() =>
        findMethod({
          id: 1,
          payload: { method: name },
        } as any)
      ).toThrow(`Method ${name} is not set`);
    }
  );
});
