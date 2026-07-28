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
    expect(api.uploadPortfolio).toBeInstanceOf(Function);

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
