import * as publicMethods from '../src/api';
import { findMethod } from '../src/api/utils';
import { createCoreApi } from '../src/inject';

import type { CoreApi } from '../src/types/api';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const publicDevelopmentMethodNames = [
  'deviceInfoGet',
  'deviceStatusGet',
  'protocolInfoRequest',
  'ping',
  'deviceGetFirmwareUpdateStatus',
  'deviceFactoryInfoGet',
] as const;

const removedRawSettingsMethodNames = [
  'deviceSettingsGet',
  'deviceSettingsSet',
  'deviceSettingsPageShow',
] as const;

const publicFilesystemMethodNames = ['fileRead', 'dirList', 'dirMake', 'pathInfo'] as const;

const removedPrivilegedMethodNames = [
  'deviceFactoryInfoSet',
  'filesystemFormat',
  'filesystemPermissionFix',
  'deviceFirmwareUpdate',
  'fileWrite',
  'fileDelete',
  'dirRemove',
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
  test('exposes the explicit development surface without the raw wallet session command', () => {
    const api = createCoreApi(jest.fn() as CoreApi['call']) as Record<string, unknown>;

    expect(api.deviceGetOnboardingStatus).toBeInstanceOf(Function);
    expect(api.uploadPortfolio).toBeInstanceOf(Function);

    publicDevelopmentMethodNames.forEach(name => {
      expect(api).toHaveProperty(name, expect.any(Function));
      expect(publicMethods).toHaveProperty(name);
    });
    publicFilesystemMethodNames.forEach(name => {
      expect(api).toHaveProperty(name, expect.any(Function));
      expect(publicMethods).toHaveProperty(name);
    });
    expect(api).not.toHaveProperty('deviceSessionOpen');
    expect(publicMethods).not.toHaveProperty('deviceSessionOpen');
    removedRawSettingsMethodNames.forEach(name => {
      expect(api).not.toHaveProperty(name);
      expect(publicMethods).not.toHaveProperty(name);
    });
    removedPrivilegedMethodNames.forEach(name => {
      expect(api).not.toHaveProperty(name);
      expect(publicMethods).not.toHaveProperty(name);
    });
    unpublishedFilesystemAliases.forEach(name => {
      expect(api).not.toHaveProperty(name);
      expect(publicMethods).not.toHaveProperty(name);
    });
  });

  test.each([...publicDevelopmentMethodNames, ...publicFilesystemMethodNames])(
    'keeps %s available to the dispatcher',
    name => {
      expect(
        findMethod({
          id: 1,
          payload: { method: name },
        } as any)
      ).toBeDefined();
    }
  );

  test('rejects deviceSessionOpen at the SDK dispatcher boundary', () => {
    expect(() =>
      findMethod({
        id: 1,
        payload: { method: 'deviceSessionOpen' },
      } as any)
    ).toThrow('Method deviceSessionOpen is not set');
  });

  test.each(removedRawSettingsMethodNames)(
    'rejects removed raw settings method %s at the SDK dispatcher boundary',
    name => {
      expect(() =>
        findMethod({
          id: 1,
          payload: { method: name },
        } as any)
      ).toThrow(`Method ${name} is not set`);
    }
  );

  test.each(removedPrivilegedMethodNames)(
    'rejects removed privileged method %s at the SDK dispatcher boundary',
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
