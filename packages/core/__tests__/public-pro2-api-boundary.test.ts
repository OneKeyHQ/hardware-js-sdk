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

describe('public factory and Protocol V2 API boundary', () => {
  test('exposes business APIs without raw device or filesystem commands', () => {
    const api = createCoreApi(jest.fn() as CoreApi['call']) as Record<string, unknown>;

    expect(api.deviceGetOnboardingStatus).toBeInstanceOf(Function);
    expect(api.deviceFactoryPermanentLock).toBeInstanceOf(Function);
    expect(api.deviceProvisionFactoryInfo).toBeInstanceOf(Function);
    expect(api.deviceReadFactoryInfo).toBeInstanceOf(Function);
    expect(api.deviceWriteFactoryCertificate).toBeInstanceOf(Function);
    expect(api.deviceReadFactoryCertificate).toBeInstanceOf(Function);
    expect(api.deviceSignFactoryChallenge).toBeInstanceOf(Function);
    expect(api.deviceInfoSettings).toBeInstanceOf(Function);
    expect(api.deviceGetInfo).toBeInstanceOf(Function);
    expect(api.deviceWriteSEPrivateKey).toBeInstanceOf(Function);
    expect(api.deviceReadSEPublicCert).toBeInstanceOf(Function);
    expect(api.deviceWriteSEPublicCert).toBeInstanceOf(Function);
    expect(api.deviceSESignMessage).toBeInstanceOf(Function);
    expect(api.deviceUploadNft).toBeInstanceOf(Function);
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

  test('routes semantic Protocol V2 factory APIs', async () => {
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

    await api.deviceProvisionFactoryInfo('neo', {
      version: 1,
      serial_number: 'NEO00000001',
      burn_in_completed: true,
      factory_test_completed: true,
      manufacture_time: manufactureTime,
      connectProtocol: 'V2',
    });
    await api.deviceFactoryPermanentLock('neo', { connectProtocol: 'V2' });
    await api.deviceReadFactoryInfo('neo', { connectProtocol: 'V2' });
    await api.deviceWriteFactoryCertificate('neo', {
      certificate: 'aabb',
      connectProtocol: 'V2',
    });
    await api.deviceReadFactoryCertificate('neo', { connectProtocol: 'V2' });
    await api.deviceSignFactoryChallenge('neo', {
      digest: '22'.repeat(32),
      connectProtocol: 'V2',
    });

    expect(call).toHaveBeenNthCalledWith(1, {
      method: 'deviceProvisionFactoryInfo',
      connectId: 'neo',
      version: 1,
      serial_number: 'NEO00000001',
      burn_in_completed: true,
      factory_test_completed: true,
      manufacture_time: manufactureTime,
      connectProtocol: 'V2',
    });
    expect(call).toHaveBeenNthCalledWith(2, {
      method: 'deviceFactoryPermanentLock',
      connectId: 'neo',
      connectProtocol: 'V2',
    });
    expect(call).toHaveBeenNthCalledWith(3, {
      method: 'deviceReadFactoryInfo',
      connectId: 'neo',
      connectProtocol: 'V2',
    });
    expect(call).toHaveBeenNthCalledWith(4, {
      method: 'deviceWriteFactoryCertificate',
      connectId: 'neo',
      certificate: 'aabb',
      connectProtocol: 'V2',
    });
    expect(call).toHaveBeenNthCalledWith(5, {
      method: 'deviceReadFactoryCertificate',
      connectId: 'neo',
      connectProtocol: 'V2',
    });
    expect(call).toHaveBeenNthCalledWith(6, {
      method: 'deviceSignFactoryChallenge',
      connectId: 'neo',
      digest: '22'.repeat(32),
      connectProtocol: 'V2',
    });
  });

  test('routes Pro Protocol V1 factory APIs', async () => {
    const call = jest.fn().mockResolvedValue({ success: true, payload: {} });
    const api = createCoreApi(call as CoreApi['call']) as CoreApi;

    await api.deviceInfoSettings('pro', {
      serial_no: 'PRO00000001',
      cpu_info: 'cpu',
      pre_firmware: 'factory',
      connectProtocol: 'V1',
    });
    await api.deviceGetInfo('pro', { connectProtocol: 'V1' });
    await api.deviceReadSEPublicCert('pro', { connectProtocol: 'V1' });
    await api.deviceWriteSEPrivateKey('pro', {
      private_key: '',
      connectProtocol: 'V1',
    });
    await api.deviceWriteSEPublicCert('pro', {
      public_cert: 'test-certificate',
      connectProtocol: 'V1',
    });
    await api.deviceSESignMessage('pro', {
      message: 'test-challenge',
      connectProtocol: 'V1',
    });

    expect(call.mock.calls.map(([payload]) => payload.method)).toEqual([
      'deviceInfoSettings',
      'deviceGetInfo',
      'deviceReadSEPublicCert',
      'deviceWriteSEPrivateKey',
      'deviceWriteSEPublicCert',
      'deviceSESignMessage',
    ]);
    call.mock.calls.forEach(([payload]) => {
      expect(payload).toMatchObject({ connectId: 'pro', connectProtocol: 'V1' });
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
